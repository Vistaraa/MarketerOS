/** /api/v1/ai handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { z } from "zod";
import { generateInsight, generateText } from "@/lib/ai";
import { recordAudit } from "@/lib/audit";
import { cacheGetOrSet } from "@/lib/cache";
import { listPersistedInsights } from "@/lib/repositories";
import { aiInput, ok, error, context, aiErrorResponse, type V1Context } from "@/lib/api/v1/core";

export async function GET({ path, auth }: V1Context): Promise<Response | null> {
  if (path === "ai/insights") return ok(await cacheGetOrSet(`ws:${auth.session.workspaceId}:v1:ai/insights`, async () => ({ items: await listPersistedInsights(auth.session.workspaceId) }), 15_000));
  return null;
}

export async function POST({ path, body }: V1Context): Promise<Response | null> {
  if (path === "ai/generate") {
    const auth = await context("content.edit");
    if (auth.error) return auth.error;
    const parsed = aiInput.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid AI request.");
    try { return ok(await generateText({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, kind: parsed.data.kind, prompt: parsed.data.prompt }), undefined, { status: 201 }); } catch (cause) { return aiErrorResponse(cause); }
  }
  if (path === "ai/insights/generate") {
    const auth = await context("analytics.view");
    if (auth.error) return auth.error;
    const parsed = z.object({ context: z.string().min(3).max(20000) }).safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid insight context.");
    try { return ok(await generateInsight({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, context: parsed.data.context }), undefined, { status: 201 }); } catch (cause) { return aiErrorResponse(cause); }
  }
  return null;
}

export async function PATCH({ path, auth, body }: V1Context): Promise<Response | null> {
  if (path.startsWith("ai/insights/")) {
    const id = path.split("/")[2];
    const { updatePersistedInsightStatus } = await import("@/lib/repositories");
    const status = String(body?.status || "REVIEWED");
    const updated = await updatePersistedInsightStatus(auth.session.workspaceId, id, status);
    if (!updated.count) return error("Insight not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE_STATUS", module: "ai_insights", entityType: "AIInsight", entityId: id, afterData: { status } });
    return ok({ id, status });
  }
  return null;
}
