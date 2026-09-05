import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { listPersistedIntegrations, connectPersistedIntegrationCredentials } from "@/lib/repositories";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const integrations = await listPersistedIntegrations(session.workspaceId);
  return NextResponse.json(integrations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const integration = await connectPersistedIntegrationCredentials({
      workspaceId: session.workspaceId,
      ...body
    });
    return NextResponse.json(integration, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to connect integration" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Integration id is required" }, { status: 400 });
  await prisma.integration.deleteMany({ where: { id, workspaceId: session.workspaceId } });
  return NextResponse.json({ success: true, message: "Integration disconnected" });
}
