import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

function client() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined
  });
}

export async function generateText(input: {
  workspaceId: string;
  userId: string;
  kind: string;
  prompt: string;
  feature?: string;
}) {
  const model = process.env.OPENAI_MODEL || "gemini-3.6-flash";
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

    // Standard Chat Completions API (Supported by OpenAI, Google Gemini, Groq, OpenRouter)
    try {
      const completion = await client().chat.completions.create({
        model,
        messages: [{ role: "user", content: input.prompt }],
        temperature: 0.7
      });
      output = completion.choices[0]?.message?.content || "";
      inputTokens = completion.usage?.prompt_tokens || 0;
      outputTokens = completion.usage?.completion_tokens || 0;
    } catch (chatError) {
      // Fallback for providers or models supporting responses.create
      const response = await client().responses.create({ model, input: input.prompt });
      output = response.output_text || "";
      inputTokens = (response.usage as any)?.input_tokens || 0;
      outputTokens = (response.usage as any)?.output_tokens || 0;
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
    const message = error instanceof Error ? error.message : "AI generation failed.";
    await prisma.aIRequest.update({
      where: { id: request.id },
      data: { status: "failed", errorMessage: message }
    });
    throw new Error(message);
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
