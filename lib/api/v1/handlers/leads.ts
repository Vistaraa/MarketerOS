/** /api/v1/leads handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { recordAudit } from "@/lib/audit";
import { paged } from "@/lib/api-contracts";
import { cacheGetOrSet } from "@/lib/cache";
import { convertPersistedLeadToClient, createPersistedLead, deletePersistedLead, getPersistedLead, listPersistedLeads, updatePersistedLead } from "@/lib/repositories";
import { leadInput, ok, error, isLeadOwnerAllowed, type V1Context } from "@/lib/api/v1/core";

export async function GET({ url, path, auth, listQuery, query }: V1Context): Promise<Response | null> {
  if (path === "leads") {
    const key = `ws:${auth.session.workspaceId}:v1:leads:${url.search}`;
    const source = await cacheGetOrSet(key, async () => listPersistedLeads(auth.session.workspaceId, query), 15_000);
    const filtered = source.filter((item) => !listQuery.status || item.status.toLowerCase() === listQuery.status.toLowerCase());
    const result = paged(filtered, listQuery);
    return ok({ items: result.items, total: result.total }, { page: listQuery.page, pageSize: listQuery.pageSize, total: result.total });
  }
  if (path.startsWith("leads/")) {
    const id = path.split("/")[1];
    const found = await getPersistedLead(auth.session.workspaceId, id);
    return found ? ok(found) : error("Lead not found.", 404);
  }
  return null;
}

export async function POST({ path, auth, body }: V1Context): Promise<Response | null> {
  if (path === "leads") {
    const parsed = leadInput.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid lead.");
    if (parsed.data.ownerId && !(await isLeadOwnerAllowed(auth.session.workspaceId, parsed.data.ownerId))) {
      return error("The lead owner must be a member of this workspace.", 400, "INVALID_LEAD_OWNER");
    }
    const created = await createPersistedLead({ workspaceId: auth.session.workspaceId, ...parsed.data });
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "CREATE", module: "leads", entityType: "Lead", entityId: created.id, afterData: created });
    return ok(created, undefined, { status: 201 });
  }
  if (path.startsWith("leads/") && path.endsWith("/convert")) {
    const id = path.split("/")[1];
    const client = await convertPersistedLeadToClient(auth.session.workspaceId, id);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "CONVERT_TO_CLIENT", module: "leads", entityType: "Lead", entityId: id, afterData: { clientId: client.id } });
    return ok({ success: true, client, message: `Lead converted to client workspace ${client.name}!` });
  }
  return null;
}

export async function PATCH({ path, auth, body }: V1Context): Promise<Response | null> {
  if (path.startsWith("leads/")) {
    const id = path.split("/")[1];
    if (body && Object.keys(body).length > 0) {
      const parsed = leadInput.partial().safeParse(body);
      if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid lead update.");
      if (parsed.data.ownerId && !(await isLeadOwnerAllowed(auth.session.workspaceId, parsed.data.ownerId))) {
        return error("The lead owner must be a member of this workspace.", 400, "INVALID_LEAD_OWNER");
      }
      const updated = await updatePersistedLead(auth.session.workspaceId, id, parsed.data);
      if (!updated.count) return error("Lead not found.", 404);
      await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE", module: "leads", entityType: "Lead", entityId: id, afterData: body });
      return ok({ id, updated: true });
    }
    return error("No data provided to update lead.");
  }
  return null;
}

export async function DELETE({ auth, entity, id }: V1Context): Promise<Response | null> {
  if (entity === "leads") {
    const result = await deletePersistedLead(auth.session.workspaceId, id);
    if (!result.count) return error("Lead not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "DELETE", module: "leads", entityType: "Lead", entityId: id });
    return ok({ deleted: id });
  }
  return null;
}
