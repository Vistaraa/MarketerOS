import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

function client() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateText(input: { workspaceId: string; userId: string; kind: string; prompt: string }) {
  const model = process.env.OPENAI_MODEL || "gpt-5.6";
  const request = await prisma.aIRequest.create({ data: { workspaceId: input.workspaceId, userId: input.userId, kind: input.kind, prompt: input.prompt, model, status: "running" } });
  try {
    const response = await client().responses.create({ model, input: input.prompt });
    const output = response.output_text || "";
    const usage = response.usage as { input_tokens?: number; output_tokens?: number } | undefined;
    const updated = await prisma.aIRequest.update({ where: { id: request.id }, data: { status: "complete", output, inputTokens: usage?.input_tokens, outputTokens: usage?.output_tokens } });
    return { id: updated.id, output, model, usage: { inputTokens: usage?.input_tokens || 0, outputTokens: usage?.output_tokens || 0 } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed.";
    await prisma.aIRequest.update({ where: { id: request.id }, data: { status: "failed", errorMessage: message } });
    throw new Error(message);
  }
}

export async function generateInsight(input: { workspaceId: string; userId: string; context: string }) {
  const result = await generateText({ workspaceId: input.workspaceId, userId: input.userId, kind: "insight", prompt: `Analyze the following marketing context and return a concise actionable insight with a title, explanation, impact, and confidence percentage. Do not invent unavailable metrics.\n\n${input.context}` });
  const title = result.output.split("\n")[0]?.replace(/^title:\s*/i, "").trim() || "New marketing insight";
  const insight = await prisma.aIInsight.create({ data: { workspaceId: input.workspaceId, recipientUserId: input.userId, type: "CAMPAIGN", title, description: result.output, expectedImpact: "Review", confidence: 0 } });
  return { ...result, insightId: insight.id };
}
