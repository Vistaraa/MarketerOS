/** /api/v1/automation handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { cacheGetOrSet } from "@/lib/cache";
import { listPersistedAutomations } from "@/lib/repositories";
import { automationInput, ok, error, context, type V1Context } from "@/lib/api/v1/core";

export async function GET({ path, auth, listQuery }: V1Context): Promise<Response | null> {
  if (path === "automation") return ok(await cacheGetOrSet(`ws:${auth.session.workspaceId}:v1:automation`, async () => ({ items: await listPersistedAutomations(auth.session.workspaceId), filters: listQuery }), 15_000));
  if (path.startsWith("automation/")) {
    const id = path.split("/")[1];
    const { getPersistedAutomationWithLogs } = await import("@/lib/repositories");
    const found = await getPersistedAutomationWithLogs(auth.session.workspaceId, id);
    return found ? ok(found) : error("Automation rule not found.", 404);
  }
  return null;
}

export async function POST({ path, body }: V1Context): Promise<Response | null> {
  if (path === "automation") {
    const auth = await context("automation.manage"); if (auth.error) return auth.error; const parsed = automationInput.safeParse(body); if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid automation."); const created = await prisma.automation.create({ data: { workspaceId: auth.session.workspaceId, name: parsed.data.name, description: parsed.data.description, trigger: parsed.data.trigger, action: parsed.data.action, campaignId: parsed.data.campaignId, triggerConfig: parsed.data.triggerConfig as never, actionConfig: parsed.data.actionConfig as never, isActive: parsed.data.isActive ?? true } }); return ok(created, undefined, { status: 201 });
  }
  if (path.startsWith("automation/") && path.endsWith("/run")) {
    const auth = await context("automation.manage"); if (auth.error) return auth.error;
    const id = path.split("/")[1];
    const { evaluateAutomationRule } = await import("@/lib/repositories");
    const result = await evaluateAutomationRule(auth.session.workspaceId, id);
    return ok(result);
  }
  return null;
}

export async function PATCH({ path, auth, body }: V1Context): Promise<Response | null> {
  if (path.startsWith("automation/")) {
    const id = path.split("/")[1];
    const { updatePersistedAutomation } = await import("@/lib/repositories");
    const updated = await updatePersistedAutomation(auth.session.workspaceId, id, body as never);
    if (!updated.count) return error("Automation rule not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE", module: "automation", entityType: "Automation", entityId: id, afterData: body });
    return ok({ id, updated: true });
  }
  return null;
}

export async function DELETE({ auth, entity, id }: V1Context): Promise<Response | null> {
  if (entity === "automation") {
    const { deletePersistedAutomation } = await import("@/lib/repositories");
    const result = await deletePersistedAutomation(auth.session.workspaceId, id);
    if (!result.count) return error("Automation rule not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "DELETE", module: "automation", entityType: "Automation", entityId: id });
    return ok({ deleted: id });
  }
  return null;
}
