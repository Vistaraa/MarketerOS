import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getPersistedCampaign, updatePersistedCampaignStatus, archivePersistedCampaign } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await getPersistedCampaign(session.workspaceId, params.id);
  if (!data) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const updated = await updatePersistedCampaignStatus(session.workspaceId, params.id, body.status || "ACTIVE");
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update campaign" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await archivePersistedCampaign(session.workspaceId, params.id);
  return NextResponse.json({ success: true, message: "Campaign archived" });
}
