import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { listPersistedCampaigns, createPersistedCampaign } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaigns = await listPersistedCampaigns(session.workspaceId);
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const created = await createPersistedCampaign({
      workspaceId: session.workspaceId,
      createdById: session.userId,
      ...body
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to create campaign" }, { status: 400 });
  }
}
