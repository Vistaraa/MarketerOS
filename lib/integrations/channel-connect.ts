import { NextResponse } from "next/server";
import { z } from "zod";
import { can, getSession } from "@/lib/auth-server";
import { emailVerificationGuard } from "@/lib/email-verification";
import { subscriptionWriteGuard } from "@/lib/subscription";
import { connectPersistedIntegrationCredentials } from "@/lib/repositories";
import { encryptSecret } from "@/lib/crypto";
import { enqueueJob } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { CHANNELS, type ChannelKey } from "@/lib/integrations/channels";
import { ProviderError } from "@/lib/integrations/errors";

const input = z.object({
  accountId: z.string().trim().min(1, "Enter the account ID."),
  accessToken: z.string().trim().min(10, "Paste the access token."),
  accountName: z.string().trim().max(200).optional()
});

/**
 * Connects LinkedIn Ads, TikTok Ads or Shopify with a pasted token: the token must be able to read the account
 * (nothing is saved otherwise), is stored encrypted, and the first 30-day sync is queued.
 */
export async function connectChannel(request: Request, key: ChannelKey) {
  const channel = CHANNELS[key];
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "settings.manage")) return NextResponse.json({ error: "You do not have permission to connect integrations." }, { status: 403 });
  const blocked = (await emailVerificationGuard(session.userId)) || (await subscriptionWriteGuard(session.workspaceId));
  if (blocked) return blocked;

  const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  // The Shopify form sends its Admin API token as `apiKey`.
  const parsed = input.safeParse({ ...raw, accessToken: raw?.accessToken ?? raw?.apiKey });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request." }, { status: 400 });

  let account;
  try {
    account = await channel.verify(parsed.data.accessToken, parsed.data.accountId);
  } catch (error) {
    const message = error instanceof ProviderError ? error.message : `${channel.label} couldn't be reached.`;
    return NextResponse.json({ error: `${channel.label} rejected this connection. ${message}` }, { status: error instanceof ProviderError && error.status === 400 ? 400 : 422 });
  }

  try {
    const integration = await connectPersistedIntegrationCredentials({
      workspaceId: session.workspaceId,
      platform: channel.label === "LinkedIn Ads" ? "LinkedIn" : channel.label === "TikTok Ads" ? "TikTok" : "Shopify",
      providerKey: key,
      accountName: parsed.data.accountName || account.name,
      accountId: account.id,
      apiKey: parsed.data.accessToken,
      metadata: { currency: account.currency, timezone: account.timezone || null, verifiedAt: new Date().toISOString() }
    });
    await prisma.integration.update({ where: { id: integration.id }, data: { accessTokenEncrypted: encryptSecret(parsed.data.accessToken) } });
    const job = await enqueueJob("integration.sync", { workspaceId: session.workspaceId, integrationId: integration.id, from: new Date(Date.now() - 30 * 86_400_000).toISOString(), to: new Date().toISOString() });
    await recordAudit({ workspaceId: session.workspaceId, userId: session.userId, action: "CONNECT", module: "integrations", entityType: "Integration", entityId: integration.id, afterData: { platform: channel.platform, accountId: account.id } });
    return NextResponse.json({ success: true, data: { ...integration, syncJobId: job.id } });
  } catch (error) {
    console.error(`[${key}] saving the connection failed:`, error);
    return NextResponse.json({ error: `Failed to save the ${channel.label} connection.` }, { status: 500 });
  }
}
