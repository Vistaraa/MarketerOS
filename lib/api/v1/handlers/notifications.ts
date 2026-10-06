/** /api/v1/notifications handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { prisma } from "@/lib/prisma";
import { listPersistedNotifications } from "@/lib/repositories";
import { ok, error, type V1Context } from "@/lib/api/v1/core";

export async function GET({ url, path, auth }: V1Context): Promise<Response | null> {
  if (path === "notifications") {
    const items = await listPersistedNotifications(auth.session.workspaceId, auth.session.userId, url.searchParams.get("unread") === "true");
    return ok({ items: items.map((item) => ({ id: item.id, title: item.title, message: item.message, read: Boolean(item.readAt), link: item.link, createdAt: item.createdAt })) });
  }
  return null;
}

export async function POST({ path, auth }: V1Context): Promise<Response | null> {
  if (path === "notifications/read-all") { await prisma.notification.updateMany({ where: { workspaceId: auth.session.workspaceId, userId: auth.session.userId, readAt: null }, data: { readAt: new Date() } }); return ok({ updated: true }); }
  return null;
}

export async function PATCH({ path, auth }: V1Context): Promise<Response | null> {
  if (path.startsWith("notifications/")) { const id = path.split("/")[1]; const updated = await prisma.notification.updateMany({ where: { id, workspaceId: auth.session.workspaceId, userId: auth.session.userId }, data: { readAt: new Date() } }); return updated.count ? ok({ id, read: true }) : error("Notification not found.", 404); }
  return null;
}
