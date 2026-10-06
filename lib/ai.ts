import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getAICreditStatus } from "@/lib/ai-credits";
import { hitRateLimit } from "@/lib/rate-limit";

/**
 * An AI failure with a message that is safe to show users. Provider details (which can include account or
 * quota specifics) are logged server-side instead.
 */
export class AIError extends Error {
  constructor(public code: string, message: string, public status: number, public retryAfterSeconds?: number) {
    super(message);
    this.name = "AIError";
  }
}

const AI_REQUESTS_PER_USER_PER_MINUTE = 20;
const AI_REQUESTS_PER_WORKSPACE_PER_HOUR = 300;

function client() {
  if (!process.env.OPENAI_API_KEY) throw new AIError("AI_NOT_CONFIGURED", "AI features aren't configured on this server.", 503);
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    timeout: 60_000,
    maxRetries: 1
  });
}

/** Maps provider/SDK errors to a stable code and a user-safe message. */
function toAIError(error: unknown): AIError {
  if (error instanceof AIError) return error;
  if (error instanceof OpenAI.APIConnectionTimeoutError) return new AIError("AI_TIMEOUT", "The AI provider took too long to respond. Please try again.", 504);
  if (error instanceof OpenAI.APIConnectionError) return new AIError("AI_PROVIDER_UNAVAILABLE", "The AI provider couldn't be reached. Please try again shortly.", 503);
  if (error instanceof OpenAI.APIError) {
    const text = `${error.message || ""} ${JSON.stringify(error.error || "")}`.toLowerCase();
    if (error.status === 429 && /quota|billing|exceeded your current/.test(text)) {
      return new AIError("AI_QUOTA_EXCEEDED", "The AI provider's usage quota for this server is used up. Please try again later.", 503);
    }
    if (error.status === 429) return new AIError("AI_PROVIDER_BUSY", "The AI provider is rate-limiting requests right now. Please try again in a minute.", 503, 60);
    if (error.status === 401 || error.status === 403) return new AIError("AI_PROVIDER_AUTH", "The AI provider rejected this server's API key.", 503);
    if (error.status === 404) return new AIError("AI_MODEL_NOT_FOUND", "The configured AI model isn't available from the provider.", 503);
    if (error.status === 400) return new AIError("AI_REQUEST_REJECTED", "The AI provider rejected this request. Try shortening or rephrasing the prompt.", 400);
  }
  return new AIError("AI_FAILED", "AI generation failed. Please try again.", 502);
}

export async function generateText(input: {
  workspaceId: string;
  userId: string;
  kind: string;
  prompt: string;
  feature?: string;
}) {
  // Cost controls: per-user burst limit, per-workspace hourly limit, and the plan's monthly AI credits.
  const perUser = await hitRateLimit(`ai:user:${input.userId}`, AI_REQUESTS_PER_USER_PER_MINUTE, 60);
  if (!perUser.allowed) throw new AIError("AI_RATE_LIMITED", "You're sending AI requests too quickly. Please wait a moment.", 429, perUser.retryAfterSeconds);
  const perWorkspace = await hitRateLimit(`ai:ws:${input.workspaceId}`, AI_REQUESTS_PER_WORKSPACE_PER_HOUR, 60 * 60);
  if (!perWorkspace.allowed) throw new AIError("AI_RATE_LIMITED", "Your workspace has reached its hourly AI request limit. Please try again later.", 429, perWorkspace.retryAfterSeconds);
  const credits = await getAICreditStatus(input.workspaceId);
  if (credits.remaining <= 0) {
    throw new AIError("AI_CREDITS_EXHAUSTED", "You've used all AI credits for this billing period. Upgrade your plan or buy a credit pack to continue.", 402);
  }

  const model = process.env.OPENAI_MODEL || "gemini-3.6-flash";
  const ai = client();
  const feature = input.feature || (input.kind === "insight" ? "AI Insights" : "Content Studio");
  const request = await prisma.aIRequest.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      feature,
      kind: input.kind,
      prompt: input.prompt,
      model,
      status: "running"
    }
  });

  try {
    let output = "";
    let inputTokens = 0;
    let outputTokens = 0;

    // Standard Chat Completions API (supported by OpenAI, Google Gemini, Groq, OpenRouter).
    try {
      const completion = await ai.chat.completions.create({
        model,
        messages: [{ role: "user", content: input.prompt }],
        temperature: 0.7
      });
      output = completion.choices[0]?.message?.content || "";
      inputTokens = completion.usage?.prompt_tokens || 0;
      outputTokens = completion.usage?.completion_tokens || 0;
    } catch (chatError) {
      // Only providers without a chat endpoint get the Responses API fallback. For any other failure (quota,
      // auth, rate limit...) report the original error: falling back used to hide it behind a misleading 404.
      if (!(chatError instanceof OpenAI.NotFoundError)) throw chatError;
      try {
        const response = await ai.responses.create({ model, input: input.prompt });
        output = response.output_text || "";
        inputTokens = (response.usage as any)?.input_tokens || 0;
        outputTokens = (response.usage as any)?.output_tokens || 0;
      } catch {
        throw chatError;
      }
    }

    const tokensTotal = inputTokens + outputTokens;

    const updated = await prisma.aIRequest.update({
      where: { id: request.id },
      data: {
        status: "complete",
        output,
        inputTokens,
        outputTokens,
        tokensTotal
      }
    });

    return {
      id: updated.id,
      output,
      model,
      usage: { inputTokens, outputTokens, tokensTotal }
    };
  } catch (error) {
    const aiError = toAIError(error);
    // Full provider detail for operators (and Sentry); users only ever see aiError.message.
    console.error(`[ai] ${aiError.code} for workspace ${input.workspaceId}:`, error);
    await prisma.aIRequest.update({
      where: { id: request.id },
      data: { status: "failed", errorMessage: `${aiError.code}: ${error instanceof Error ? error.message : String(error)}`.slice(0, 1000) }
    });
    throw aiError;
  }
}

interface ParsedInsight {
  title: string;
  category: "CAMPAIGN" | "KEYWORD" | "BUDGET" | "AUDIENCE" | "CONTENT";
  description: string;
  impact: string;
  confidence: number;
}

export function parseInsightOutput(rawText: string, fallbackContext: string): ParsedInsight {
  const cleaned = rawText.trim();

  // 1. Try parsing JSON if model responded with JSON code fence or object
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i) || [null, cleaned];
  const candidate = jsonMatch[1] ? jsonMatch[1].trim() : cleaned;

  try {
    const json = JSON.parse(candidate);
    if (json.title && (json.explanation || json.description)) {
      return {
        title: String(json.title).replace(/^\*+\s*title:?\s*\*+/i, "").replace(/^\*\*|\*\*$/g, "").trim(),
        category: (["CAMPAIGN", "KEYWORD", "BUDGET", "AUDIENCE", "CONTENT"].includes(String(json.category).toUpperCase())
          ? String(json.category).toUpperCase()
          : "CAMPAIGN") as any,
        description: String(json.explanation || json.description).replace(/^\*+\s*explanation:?\s*\*+/i, "").trim(),
        impact: String(json.impact || "Reduces CPA and improves ROAS").replace(/^\*+\s*impact:?\s*\*+/i, "").trim(),
        confidence: Number(json.confidence) || 90
      };
    }
  } catch {
    // Proceed to structured text regex parsing
  }

  // 2. Structured markdown regex parser
  let title = "Campaign Bid & Budget Optimization";
  let description = cleaned;
  let impact = "Reduces wasted ad spend and improves traffic quality";
  let confidence = 90;
  let category: "CAMPAIGN" | "KEYWORD" | "BUDGET" | "AUDIENCE" | "CONTENT" = "CAMPAIGN";

  const titleMatch = cleaned.match(/\*\*Title:\*\*\s*([^\n*]+)/i) || cleaned.match(/Title:\s*([^\n*]+)/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].replace(/^\*\*|\*\*$/g, "").trim();
  }

  const impactMatch = cleaned.match(/\*\*Impact:\*\*\s*([^\n*]+)/i) || cleaned.match(/Impact:\s*([^\n*]+)/i);
  if (impactMatch && impactMatch[1]) {
    impact = impactMatch[1].replace(/^\*\*|\*\*$/g, "").trim();
  }

  const confidenceMatch = cleaned.match(/\*\*Confidence:\*\*\s*(\d+)%?/i) || cleaned.match(/Confidence:\s*(\d+)%?/i);
  if (confidenceMatch && confidenceMatch[1]) {
    confidence = Math.min(99, Math.max(50, parseInt(confidenceMatch[1], 10)));
  }

  const explanationMatch =
    cleaned.match(/\*\*Explanation:\*\*\s*([\s\S]*?)(?=\*\*Impact:|\*\*Confidence:|$)/i) ||
    cleaned.match(/Explanation:\s*([\s\S]*?)(?=Impact:|Confidence:|$)/i);

  if (explanationMatch && explanationMatch[1]) {
    description = explanationMatch[1].trim();
  } else {
    description = cleaned
      .replace(/\*\*Title:\*\*[^\n*]+/gi, "")
      .replace(/Title:[^\n*]+/gi, "")
      .replace(/\*\*Impact:\*\*[^\n*]+/gi, "")
      .replace(/Impact:[^\n*]+/gi, "")
      .replace(/\*\*Confidence:\*\*\s*\d+%?/gi, "")
      .replace(/Confidence:\s*\d+%?/gi, "")
      .replace(/\*\*Explanation:\*\*/gi, "")
      .trim();
  }

  const lower = (title + " " + description).toLowerCase();
  if (lower.includes("keyword") || lower.includes("search term") || lower.includes("negative")) {
    category = "KEYWORD";
  } else if (lower.includes("budget") || lower.includes("cpc") || lower.includes("spend") || lower.includes("bid")) {
    category = "BUDGET";
  } else if (lower.includes("audience") || lower.includes("demographic") || lower.includes("targeting")) {
    category = "AUDIENCE";
  } else if (lower.includes("creative") || lower.includes("headline") || lower.includes("copy")) {
    category = "CONTENT";
  }

  return { title, category, description, impact, confidence };
}

export async function generateInsight(input: {
  workspaceId: string;
  userId: string;
  context: string;
}) {
  const result = await generateText({
    workspaceId: input.workspaceId,
    userId: input.userId,
    kind: "insight",
    feature: "AI Insights",
    prompt: `You are an expert performance marketing analyst for MarketerOS. Analyze the following campaign context and provide an actionable optimization recommendation in strict JSON format:
{
  "title": "Concise headline (max 8 words, no markdown)",
  "category": "CAMPAIGN" | "KEYWORD" | "BUDGET" | "AUDIENCE" | "CONTENT",
  "explanation": "Clear explanation of the problem, mathematical calculations (e.g. CPC, CPA, conversion rate), and step-by-step actionable guidance (use clean markdown without raw title or confidence labels)",
  "impact": "Single-sentence quantifiable metric outcome (e.g. 'Reduces wasted ad spend by ~$1,400/mo and lowers CPA')",
  "confidence": 92
}
Do not invent unavailable metrics. Respond ONLY with valid JSON.

Marketing Context:
${input.context}`
  });

  const parsed = parseInsightOutput(result.output, input.context);

  const insight = await prisma.aIInsight.create({
    data: {
      workspaceId: input.workspaceId,
      recipientUserId: input.userId,
      type: parsed.category,
      title: parsed.title,
      description: parsed.description,
      impact: parsed.impact,
      expectedImpact: parsed.impact,
      score: parsed.confidence,
      confidence: parsed.confidence
    }
  });

  return {
    ...result,
    insightId: insight.id,
    title: insight.title,
    impact: insight.impact,
    confidence: insight.score
  };
}
