/** /api/v1/content handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { cacheGetOrSet } from "@/lib/cache";
import { listPersistedContent } from "@/lib/repositories";
import { contentInput, ok, error, context, type V1Context } from "@/lib/api/v1/core";

export async function GET({ url, path, auth, query }: V1Context): Promise<Response | null> {
  if (path === "content") return ok(await cacheGetOrSet(`ws:${auth.session.workspaceId}:v1:content:${url.search}`, async () => ({ items: await listPersistedContent(auth.session.workspaceId, query) }), 15_000));
  if (path.startsWith("content/")) {
    const id = path.split("/")[1];
    const { getPersistedContentItem } = await import("@/lib/repositories");
    const found = await getPersistedContentItem(auth.session.workspaceId, id);
    return found ? ok(found) : error("Content item not found.", 404);
  }
  return null;
}

export async function POST({ path, body }: V1Context): Promise<Response | null> {
  if (path === "content") {
    const auth = await context("content.edit");
    if (auth.error) return auth.error;
    const parsed = contentInput.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid content.");
    const created = await prisma.content.create({
      data: {
        workspaceId: auth.session.workspaceId,
        createdById: auth.session.userId,
        title: parsed.data.title || "Untitled Content",
        type: (parsed.data.type || "SOCIAL_POST") as never,
        body: parsed.data.body || "",
        platform: parsed.data.platform ? (parsed.data.platform.replaceAll(" ", "_").toUpperCase() as never) : undefined,
        clientId: parsed.data.clientId,
        status: (parsed.data.status ? parsed.data.status.toUpperCase().replace(/\s+/g, "_") : "DRAFT") as never,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : null,
        keywords: parsed.data.keywords || [],
        metadata: (parsed.data.metadata || {}) as never
      }
    });
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "CREATE", module: "content", entityType: "Content", entityId: created.id, afterData: created });
    return ok(created, undefined, { status: 201 });
  }
  return null;
}

export async function PATCH({ path, auth, body }: V1Context): Promise<Response | null> {
  if (path.startsWith("content/")) {
    const id = path.split("/")[1];
    const { updatePersistedContentItem } = await import("@/lib/repositories");
    const updated = await updatePersistedContentItem(auth.session.workspaceId, id, body as never);
    if (!updated.count) return error("Content not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE", module: "content", entityType: "Content", entityId: id, afterData: body });
    return ok({ id, updated: true });
  }
  return null;
}

export async function DELETE({ auth, entity, id }: V1Context): Promise<Response | null> {
  if (entity === "content") {
    const { deletePersistedContentItem } = await import("@/lib/repositories");
    const result = await deletePersistedContentItem(auth.session.workspaceId, id);
    if (!result.count) return error("Content item not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "DELETE", module: "content", entityType: "Content", entityId: id });
    return ok({ deleted: id });
  }
  return null;
}
