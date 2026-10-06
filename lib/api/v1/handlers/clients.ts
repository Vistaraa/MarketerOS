/** /api/v1/clients handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { cacheGetOrSet } from "@/lib/cache";
import { planLimitGuard } from "@/lib/plan-limits";
import { listPersistedClients } from "@/lib/repositories";
import { clientInput, ok, error, context, type V1Context } from "@/lib/api/v1/core";

export async function GET({ path, auth, listQuery }: V1Context): Promise<Response | null> {
  if (path === "clients") return ok(await cacheGetOrSet(`ws:${auth.session.workspaceId}:v1:clients`, async () => ({ items: await listPersistedClients(auth.session.workspaceId), filters: listQuery }), 15_000));
  if (path.startsWith("clients/")) {
    const id = path.split("/")[1];
    const { getPersistedClient } = await import("@/lib/repositories");
    const found = await getPersistedClient(auth.session.workspaceId, id);
    return found ? ok(found) : error("Client not found.", 404);
  }
  return null;
}

export async function POST({ path, body }: V1Context): Promise<Response | null> {
  if (path === "clients") {
    const auth = await context("client.edit"); if (auth.error) return auth.error; const parsed = clientInput.safeParse(body); if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid client.");
    const overLimit = await planLimitGuard(auth.session.workspaceId, "clients"); if (overLimit) return overLimit;
    const slug = `${parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`; const created = await prisma.client.create({ data: { workspaceId: auth.session.workspaceId, name: parsed.data.name, slug, industry: parsed.data.industry, website: parsed.data.website || undefined, contactName: parsed.data.contactName, contactEmail: parsed.data.contactEmail, contactPhone: parsed.data.contactPhone, currency: parsed.data.currency || "USD", timezone: parsed.data.timezone || "UTC", monthlyBudget: parsed.data.monthlyBudget || 0, status: (parsed.data.status?.toUpperCase() || "ACTIVE") as never } }); return ok(created, undefined, { status: 201 });
  }
  return null;
}

export async function PATCH({ path, auth, body }: V1Context): Promise<Response | null> {
  if (path.startsWith("clients/")) {
    const id = path.split("/")[1];
    const { updatePersistedClient } = await import("@/lib/repositories");
    const updated = await updatePersistedClient(auth.session.workspaceId, id, body as never);
    if (!updated.count) return error("Client not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE", module: "clients", entityType: "Client", entityId: id, afterData: body });
    return ok({ id, updated: true });
  }
  return null;
}

export async function DELETE({ auth, entity, id }: V1Context): Promise<Response | null> {
  if (entity === "clients") {
    const { deletePersistedClient } = await import("@/lib/repositories");
    const result = await deletePersistedClient(auth.session.workspaceId, id);
    if (!result.count) return error("Client not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "DELETE", module: "clients", entityType: "Client", entityId: id });
    return ok({ deleted: id });
  }
  return null;
}
