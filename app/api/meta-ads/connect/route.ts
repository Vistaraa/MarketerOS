import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { can, getSession } from "@/lib/auth-server";
import { emailVerificationGuard } from "@/lib/email-verification";
import { subscriptionWriteGuard } from "@/lib/subscription";
import { connectPersistedIntegrationCredentials } from "@/lib/repositories";
import { ProviderError, metaProvider } from "@/lib/integrations/provider";
import { encryptSecret } from "@/lib/crypto";
import { enqueueJob } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const input = z.object({
  accountId: z.string().trim().transform((v) => (v.startsWith("act_") ? v : `act_${v}`)).pipe(z.string().regex(/^act_\d+$/, "Enter the ad account ID (act_ followed by digits).")),
  accessToken: z.string().trim().min(20, "Paste a Meta access token (it starts with EAA)."),
  accountName: z.string().trim().max(200).optional(),
  pixelId: z.string().trim().max(50).optional()
});

/**
 * Connects a Meta ad account with a pasted token (system-user or user token). The token must be able to read the
 * account; it is then exchanged for a long-lived token when the Meta app is configured, stored encrypted, and the
 * first metrics sync is queued.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "settings.manage")) return NextResponse.json({ error: "You do not have permission to connect integrations." }, { status: 403 });
  const blocked = (await emailVerificationGuard(session.userId)) || (await subscriptionWriteGuard(session.workspaceId));
  if (blocked) return blocked;

  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request." }, { status: 400 });
  const { accountId, accountName, pixelId } = parsed.data;
  const meta = metaProvider();

  let account: Awaited<ReturnType<typeof meta.verifyAdAccount>>;
  try {
    account = await meta.verifyAdAccount(parsed.data.accessToken, accountId);
  } catch (error) {
    const reason = error instanceof ProviderError ? error.message : "Meta couldn't be reached.";
    return NextResponse.json({ error: `Meta rejected this token for ${accountId}: ${reason}` }, { status: 422 });
  }

  // Short-lived user tokens expire within hours; swap for a ~60-day token when the app credentials are set.
  let token = parsed.data.accessToken;
  let tokenExpiresAt: Date | null = null;
  try {
    const longLived = await meta.exchangeLongLivedToken(token);
    token = longLived.accessToken;
    tokenExpiresAt = longLived.expiresAt || null;
  } catch {
    // System-user tokens don't expire and can't be exchanged; keep the token as provided.
  }

  try {
    const integration = await connectPersistedIntegrationCredentials({
      workspaceId: session.workspaceId,
      platform: "Meta Ads",
      providerKey: "meta_ads",
      accountName: accountName || account.name || `Meta Ads (${accountId})`,
      accountId,
      apiKey: token,
      metadata: { currency: account.currency || null, timezone: account.timezone_name || null, pixelId: pixelId || null, verifiedAt: new Date().toISOString() }
    });
    await prisma.integration.update({ where: { id: integration.id }, data: { accessTokenEncrypted: encryptSecret(token), tokenExpiresAt } });
    const job = await enqueueJob("integration.sync", { workspaceId: session.workspaceId, integrationId: integration.id, from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), to: new Date().toISOString() });
    await recordAudit({ workspaceId: session.workspaceId, userId: session.userId, action: "CONNECT", module: "integrations", entityType: "Integration", entityId: integration.id, afterData: { platform: "META_ADS", accountId } });
    return NextResponse.json({ success: true, data: { ...integration, tokenExpiresAt: tokenExpiresAt?.toISOString() || null, syncJobId: job.id }, isLiveVerified: true });
  } catch (error) {
    console.error("[meta-ads] Saving the connection failed:", error);
    return NextResponse.json({ error: "Failed to save the Meta Ads connection." }, { status: 500 });
  }
}
