import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { integrationConnectContext } from "@/lib/google-oauth-guard";
import { subscriptionWriteGuard } from "@/lib/subscription";

const input = z.object({
  customerId: z.string().transform((v) => v.replaceAll("-", "").trim()).pipe(z.string().regex(/^\d{10}$/, "Enter the 10-digit Google Ads customer ID (123-456-7890).")),
  accountName: z.string().trim().max(200).optional(),
  loginCustomerId: z.string().optional()
});

/**
 * Picks which Google Ads account the workspace's existing Google connection reports on. The tokens must already
 * belong to this workspace (from its own OAuth sign-in); nothing is read from or written to other workspaces.
 */
export async function POST(request: Request) {
  const auth = await integrationConnectContext();
  if (auth.response) return auth.response;
  const lapsed = await subscriptionWriteGuard(auth.session.workspaceId);
  if (lapsed) return lapsed;

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Invalid request." }, { status: 400 });
  const { customerId, accountName, loginCustomerId } = parsed.data;

  try {
    const integration = await prisma.integration.findFirst({ where: { workspaceId: auth.session.workspaceId, platform: "GOOGLE_ADS" } });
    if (!integration || (!integration.accessTokenEncrypted && !integration.refreshTokenEncrypted)) {
      return NextResponse.json({ success: false, error: "Sign in with Google first, then choose the Ads account." }, { status: 409 });
    }
    const updated = await prisma.integration.update({
      where: { id: integration.id },
      data: {
        accountName: accountName || `Google Ads (${customerId})`,
        accountId: customerId,
        status: "CONNECTED",
        errorMessage: null,
        metadata: { ...((integration.metadata as Record<string, unknown> | null) || {}), loginCustomerId: loginCustomerId?.replaceAll("-", "") || null }
      }
    });
    return NextResponse.json({
      success: true,
      data: { id: updated.id, platform: "Google Ads", accountName: updated.accountName, accountId: customerId, loginCustomerId: loginCustomerId || null, status: "Connected", lastSyncedAt: updated.lastSyncedAt }
    });
  } catch (error) {
    console.error("[google-ads] Saving the connection failed:", error);
    return NextResponse.json({ success: false, error: "Failed to save the Google Ads connection." }, { status: 500 });
  }
}
