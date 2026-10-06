import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { clearSession } from "@/lib/auth-server";
import { enqueueJob } from "@/lib/jobs";
import { objectStorage } from "@/lib/storage";
import { DELETION_GRACE_DAYS, cancelWorkspaceDeletion, leaveWorkspace, scheduleAccountDeletion, scheduleWorkspaceDeletion, verifyPassword } from "@/lib/account-deletion";
import { beginTwoFactorSetup, disableTwoFactor, enableTwoFactor, getTwoFactorStatus, regenerateRecoveryCodes, verifySecondFactor } from "@/lib/two-factor";

type Session = { userId: string; workspaceId: string; role: string };

const MAX_EXPORTS_PER_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const json = (data: unknown, status = 200) => NextResponse.json({ data }, { status });
const problem = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });
const isOwner = (session: Session) => session.role.toUpperCase() === "OWNER";
const ownerOnly = () => problem(403, "OWNER_ONLY", "Only the workspace owner can do this.");

function exportDto(row: { id: string; status: string; sizeBytes: number | null; createdAt: Date; completedAt: Date | null; expiresAt: Date | null; errorMessage: string | null }) {
  return {
    id: row.id,
    status: row.status,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() || null,
    expiresAt: row.expiresAt?.toISOString() || null,
    errorMessage: row.errorMessage,
    downloadUrl: row.status === "READY" ? `/api/v1/settings/export/${row.id}/download` : null
  };
}

/** Data & privacy endpoints. Personal ones are open to every member; workspace-wide ones are owner-only. */
export async function handleComplianceGet(path: string, session: Session) {
  if (path === "settings/2fa") return json(await getTwoFactorStatus(session.userId));
  if (path === "settings/privacy") {
    const [workspace, user] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: session.workspaceId }, select: { name: true, deletionScheduledAt: true } }),
      prisma.user.findUnique({ where: { id: session.userId }, select: { termsAcceptedAt: true, termsVersion: true } })
    ]);
    const scheduled = workspace?.deletionScheduledAt;
    return json({
      workspaceName: workspace?.name || "",
      isOwner: isOwner(session),
      workspaceDeletion: scheduled ? { scheduledAt: scheduled.toISOString(), purgeAt: new Date(scheduled.getTime() + DELETION_GRACE_DAYS * DAY_MS).toISOString() } : null,
      graceDays: DELETION_GRACE_DAYS,
      termsAcceptedAt: user?.termsAcceptedAt?.toISOString() || null,
      termsVersion: user?.termsVersion || null
    });
  }
  if (path === "settings/export") {
    if (!isOwner(session)) return ownerOnly();
    const rows = await prisma.workspaceExport.findMany({ where: { workspaceId: session.workspaceId }, orderBy: { createdAt: "desc" }, take: 10 });
    return json({ items: rows.map(exportDto) });
  }
  const download = /^settings\/export\/([^/]+)\/download$/.exec(path);
  if (download) {
    if (!isOwner(session)) return ownerOnly();
    const row = await prisma.workspaceExport.findFirst({ where: { id: download[1], workspaceId: session.workspaceId } });
    if (!row || row.status !== "READY" || !row.storageKey) return problem(404, "NOT_FOUND", "Export not found.");
    if (row.expiresAt && row.expiresAt <= new Date()) return problem(410, "EXPORT_EXPIRED", "This export has expired. Please request a new one.");
    const object = await objectStorage().get(row.storageKey);
    if (!object) return problem(404, "NOT_FOUND", "Export file not found.");
    await recordAudit({ workspaceId: session.workspaceId, userId: session.userId, action: "DOWNLOAD_EXPORT", module: "settings", entityType: "WorkspaceExport", entityId: row.id });
    return new NextResponse(new Uint8Array(object.body), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="marketeros-export-${row.createdAt.toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }
  return null;
}

const passwordInput = z.object({ password: z.string().min(1, "Enter your password to confirm.") });

export async function handleCompliancePost(path: string, session: Session, body: unknown) {
  if (path.startsWith("settings/2fa/")) return handleTwoFactorPost(path, session, body);
  if (path === "settings/export") {
    if (!isOwner(session)) return ownerOnly();
    const [pending, recent] = await Promise.all([
      prisma.workspaceExport.count({ where: { workspaceId: session.workspaceId, status: "PENDING" } }),
      prisma.workspaceExport.count({ where: { workspaceId: session.workspaceId, createdAt: { gt: new Date(Date.now() - DAY_MS) } } })
    ]);
    if (pending) return problem(409, "EXPORT_IN_PROGRESS", "An export is already being prepared. We'll email you when it's ready.");
    if (recent >= MAX_EXPORTS_PER_DAY) return problem(429, "EXPORT_LIMIT", `You can request up to ${MAX_EXPORTS_PER_DAY} exports per day. Please try again tomorrow.`);
    const row = await prisma.workspaceExport.create({ data: { workspaceId: session.workspaceId, requestedById: session.userId } });
    await enqueueJob("workspace.export", { workspaceId: session.workspaceId, exportId: row.id });
    await recordAudit({ workspaceId: session.workspaceId, userId: session.userId, action: "REQUEST_EXPORT", module: "settings", entityType: "WorkspaceExport", entityId: row.id });
    return json(exportDto(row), 202);
  }

  if (path === "settings/workspace/delete") {
    if (!isOwner(session)) return ownerOnly();
    const parsed = passwordInput.extend({ confirmName: z.string() }).safeParse(body);
    if (!parsed.success) return problem(400, "BAD_REQUEST", parsed.error.issues[0]?.message || "Invalid request.");
    const workspace = await prisma.workspace.findUnique({ where: { id: session.workspaceId }, select: { name: true } });
    if (!workspace || parsed.data.confirmName.trim().toLowerCase() !== workspace.name.trim().toLowerCase()) {
      return problem(400, "CONFIRMATION_MISMATCH", "Type the workspace name exactly to confirm.");
    }
    if (!(await verifyPassword(session.userId, parsed.data.password))) return problem(403, "INVALID_PASSWORD", "That password is incorrect.");
    const result = await scheduleWorkspaceDeletion(session.workspaceId, session.userId);
    return result.ok ? json({ purgeAt: result.purgeAt }) : problem(result.status, result.code, result.message);
  }

  if (path === "settings/workspace/restore") {
    const result = await cancelWorkspaceDeletion(session.workspaceId, session.userId);
    return result.ok ? json({ restored: true }) : problem(result.status, result.code, result.message);
  }

  if (path === "settings/account/delete") {
    const parsed = passwordInput.extend({ confirm: z.literal("DELETE", { errorMap: () => ({ message: "Type DELETE to confirm." }) }) }).safeParse(body);
    if (!parsed.success) return problem(400, "BAD_REQUEST", parsed.error.issues[0]?.message || "Invalid request.");
    if (!(await verifyPassword(session.userId, parsed.data.password))) return problem(403, "INVALID_PASSWORD", "That password is incorrect.");
    const result = await scheduleAccountDeletion(session.userId);
    if (!result.ok) return problem(result.status, result.code, result.message);
    await recordAudit({ workspaceId: session.workspaceId, userId: session.userId, action: "SCHEDULE_ACCOUNT_DELETION", module: "settings", entityType: "User", entityId: session.userId });
    await clearSession();
    return json({ purgeAt: result.purgeAt, signedOut: true });
  }

  if (path === "team/leave") {
    const result = await leaveWorkspace(session.workspaceId, session.userId);
    if (!result.ok) return problem(result.status, result.code, result.message);
    await clearSession();
    return json({ left: true, signedOut: true });
  }
  return null;
}

const codeInput = z.object({ code: z.string().trim().min(6, "Enter the 6-digit code from your authenticator app.").max(20) });

/** Two-factor setup is personal: every member manages their own. Turning it off needs the password and a code. */
async function handleTwoFactorPost(path: string, session: Session, body: unknown) {
  if (path === "settings/2fa/setup") {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
    const result = await beginTwoFactorSetup(session.userId, user?.email || session.userId);
    return result.ok ? json({ secret: result.secret, otpauthUrl: result.otpauthUrl, qrCode: result.qrCode }) : problem(result.status, result.code, result.message);
  }
  if (path === "settings/2fa/enable") {
    const parsed = codeInput.safeParse(body);
    if (!parsed.success) return problem(400, "BAD_REQUEST", parsed.error.issues[0]?.message || "Invalid code.");
    const result = await enableTwoFactor(session.userId, parsed.data.code);
    if (!result.ok) return problem(result.status, result.code, result.message);
    await recordAudit({ workspaceId: session.workspaceId, userId: session.userId, action: "ENABLE_2FA", module: "security", entityType: "User", entityId: session.userId });
    return json({ enabled: true, recoveryCodes: result.recoveryCodes });
  }
  if (path === "settings/2fa/disable" || path === "settings/2fa/recovery-codes") {
    const parsed = passwordInput.merge(codeInput).safeParse(body);
    if (!parsed.success) return problem(400, "BAD_REQUEST", parsed.error.issues[0]?.message || "Invalid request.");
    if (!(await verifyPassword(session.userId, parsed.data.password))) return problem(403, "INVALID_PASSWORD", "That password is incorrect.");
    if (!(await verifySecondFactor(session.userId, parsed.data.code))) return problem(400, "INVALID_CODE", "That code isn't valid.");
    if (path === "settings/2fa/disable") {
      await disableTwoFactor(session.userId);
      await recordAudit({ workspaceId: session.workspaceId, userId: session.userId, action: "DISABLE_2FA", module: "security", entityType: "User", entityId: session.userId });
      return json({ enabled: false });
    }
    await recordAudit({ workspaceId: session.workspaceId, userId: session.userId, action: "REGENERATE_2FA_CODES", module: "security", entityType: "User", entityId: session.userId });
    return json({ recoveryCodes: await regenerateRecoveryCodes(session.userId) });
  }
  return null;
}
