/** /api/v1/settings handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";
import { ok, error, context, type V1Context } from "@/lib/api/v1/core";

export async function GET({ path, auth }: V1Context): Promise<Response | null> {
  if (path === "settings/api-keys") {
    if (!can(auth.session.role, "settings.manage")) return error("You do not have permission to perform this action.", 403);
    const { listApiKeys } = await import("@/lib/api-keys");
    return ok({ items: await listApiKeys(auth.session.workspaceId) });
  }
  if (path === "settings") {
    const { getPersistedSettings } = await import("@/lib/settings-service");
    const data = await getPersistedSettings(auth.session.workspaceId, auth.session.userId, auth.session.role);
    return ok(data);
  }
  return null;
}

export async function POST({ request, path, body }: V1Context): Promise<Response | null> {
  if (path === "settings/api-keys") {
    const auth = await context("settings.manage");
    if (auth.error) return auth.error;
    const parsed = z.object({ name: z.string().trim().min(1, "Give the key a name.").max(80) }).safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid API key request.");
    const { createApiKey } = await import("@/lib/api-keys");
    const created = await createApiKey(auth.session.workspaceId, auth.session.userId, parsed.data.name);
    if (!created.ok) return error(created.message, 409, "API_KEY_LIMIT");
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "CREATE_API_KEY", module: "security", entityType: "ApiKey", entityId: created.key.id, afterData: { name: created.key.name, prefix: created.key.prefix } });
    // The secret is returned this once and never stored or shown again.
    return ok({ key: created.key, secret: created.secret }, undefined, { status: 201 });
  }
  if (path === "settings/change-password") {
    // Personal: every member can change their own password.
    const auth = await context("settings.view");
    if (auth.error) return auth.error;
    const parsed = z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: z.string().min(8, "New password must be at least 8 characters").max(200)
    }).safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid password data.");
    const { verifyPassword } = await import("@/lib/account-deletion");
    if (!(await verifyPassword(auth.session.userId, parsed.data.currentPassword))) return error("Your current password is incorrect.", 403, "INVALID_PASSWORD");
    if (parsed.data.currentPassword === parsed.data.newPassword) return error("Choose a password different from the current one.");
    const bcrypt = (await import("bcryptjs")).default;
    await prisma.user.update({ where: { id: auth.session.userId }, data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) } });
    // Sign out every other session: a changed password should lock out anyone who had the old one.
    const { createHash } = await import("node:crypto");
    const current = request.headers.get("cookie")?.match(/marketeros_session=([^;]+)/)?.[1];
    const currentHash = current ? createHash("sha256").update(decodeURIComponent(current)).digest("hex") : null;
    const others = await prisma.session.findMany({ where: { userId: auth.session.userId, ...(currentHash ? { NOT: { tokenHash: currentHash } } : {}) }, select: { id: true } });
    const { revokeUserSession } = await import("@/lib/auth-server");
    for (const s of others) await revokeUserSession(auth.session.userId, s.id);
    await recordAudit({
      workspaceId: auth.session.workspaceId,
      userId: auth.session.userId,
      action: "CHANGE_PASSWORD",
      module: "security",
      entityType: "User",
      entityId: auth.session.userId
    });
    return ok({ success: true, signedOutSessions: others.length, message: "Password updated. Other devices have been signed out." });
  }
  if (path === "settings/api-keys/revoke" || path.startsWith("settings/api-keys/")) {
    const auth = await context("settings.manage");
    if (auth.error) return auth.error;
    const id = path === "settings/api-keys/revoke" ? String(body?.id || body?.keyId || "") : path.split("/")[2];
    const { revokeApiKey } = await import("@/lib/api-keys");
    if (!id || !(await revokeApiKey(auth.session.workspaceId, id))) return error("API key not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "REVOKE_API_KEY", module: "security", entityType: "ApiKey", entityId: id });
    return ok({ revoked: id });
  }
  return null;
}

export async function PATCH({ path, auth, body }: V1Context): Promise<Response | null> {
  if (path === "settings/profile") {
    const parsed = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      jobTitle: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      avatarUrl: z.string().nullable().optional()
    }).safeParse(body);
    if (!parsed.success) return error("Invalid profile payload.");
    const updatedUser = await prisma.user.update({
      where: { id: auth.session.userId },
      data: parsed.data
    });
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE_PROFILE", module: "settings", entityType: "User", entityId: auth.session.userId, afterData: parsed.data });
    return ok(updatedUser);
  }
  if (path === "settings/notifications") {
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE_NOTIFICATION_PREFERENCES", module: "settings", entityType: "User", entityId: auth.session.userId, afterData: body });
    return ok({ success: true, message: "Notification preferences saved." });
  }
  if (path === "settings") {
    const settings = z.object({
      name: z.string().min(1).optional(),
      website: z.string().nullable().optional(),
      industry: z.string().nullable().optional(),
      businessType: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      currency: z.string().optional(),
      timezone: z.string().optional(),
      monthlyBudget: z.coerce.number().optional(),
      marketingGoals: z.array(z.string()).optional(),
      targetAudience: z.string().nullable().optional(),
      targetAgeRange: z.string().nullable().optional(),
      targetGeo: z.string().nullable().optional(),
      targetLanguages: z.string().nullable().optional(),
      targetInterests: z.string().nullable().optional(),
      dateFormat: z.string().optional(),
      timeFormat: z.string().optional(),
      language: z.string().optional(),
      theme: z.string().optional(),
      defaultDashboard: z.string().optional()
    }).safeParse(body);
    if (!settings.success) return error(settings.error.issues[0]?.message || "Invalid settings.");
    const updated = await prisma.workspace.update({ where: { id: auth.session.workspaceId }, data: settings.data });
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE", module: "settings", entityType: "Workspace", entityId: updated.id, afterData: settings.data });
    return ok(updated);
  }
  return null;
}

export async function DELETE({ auth, parts, entity }: V1Context): Promise<Response | null> {
  if (entity === "settings" && parts[1] === "api-keys") {
    if (!can(auth.session.role, "settings.manage")) return error("You do not have permission to perform this action.", 403);
    const { revokeApiKey } = await import("@/lib/api-keys");
    if (!parts[2] || !(await revokeApiKey(auth.session.workspaceId, parts[2]))) return error("API key not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "REVOKE_API_KEY", module: "security", entityType: "ApiKey", entityId: parts[2] });
    return ok({ revoked: parts[2] });
  }
  if (entity === "settings" && parts[1] === "sessions") {
    const sessionId = parts[2];
    const { revokeUserSession } = await import("@/lib/auth-server");
    if (!(await revokeUserSession(auth.session.userId, sessionId))) return error("Session not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "REVOKE_SESSION", module: "settings", entityType: "Session", entityId: sessionId });
    return ok({ revoked: sessionId });
  }
  return null;
}
