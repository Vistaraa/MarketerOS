import { NextRequest, NextResponse } from "next/server";
import { publicErrorMessage } from "@/lib/errors";
import { can, getSession } from "@/lib/auth-server";
import { subscriptionWriteGuard } from "@/lib/subscription";
import { campaignStatusGuard } from "@/lib/plan-limits";
import { getPersistedCampaign, updatePersistedCampaignStatus, deletePersistedCampaign } from "@/lib/repositories";
import { cacheInvalidatePrefix } from "@/lib/cache";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await getPersistedCampaign(session.workspaceId, id);
  if (!data) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "campaign.edit")) return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
  const lapsed = await subscriptionWriteGuard(session.workspaceId);
  if (lapsed) return lapsed;
  try {
    const body = await req.json();
    const overLimit = await campaignStatusGuard(session.workspaceId, id, String(body.status || "ACTIVE"));
    if (overLimit) return overLimit;
    const updated = await updatePersistedCampaignStatus(session.workspaceId, id, body.status || "ACTIVE");
    cacheInvalidatePrefix(`ws:${session.workspaceId}`);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: publicErrorMessage(err, "Failed to update campaign", "campaigns") }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "campaign.delete")) return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
  const lapsed = await subscriptionWriteGuard(session.workspaceId);
  if (lapsed) return lapsed;
  await deletePersistedCampaign(session.workspaceId, id);
  cacheInvalidatePrefix(`ws:${session.workspaceId}`);
  return NextResponse.json({ success: true, message: "Campaign deleted" });
}

