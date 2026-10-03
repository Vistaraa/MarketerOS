import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { listPersistedIntegrations, connectPersistedIntegrationCredentials } from "@/lib/repositories";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    console.warn("[PLATFORM INTEGRATION DEBUG] ⚠️ GET /api/integrations - Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log(`[PLATFORM INTEGRATION DEBUG] 🔍 Checking connected platforms for workspace: ${session.workspaceId}`);
  const integrations = await listPersistedIntegrations(session.workspaceId);
  const connectedCount = integrations.filter((i) => i.status === "Connected").length;

  console.log(`[PLATFORM INTEGRATION DEBUG] 📊 Workspace ${session.workspaceId} has ${integrations.length} total integrations (${connectedCount} Connected):`, 
    integrations.map(i => `${i.platform}: ${i.status} (${i.account || 'no-id'})`));

  return NextResponse.json(integrations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    console.warn("[PLATFORM INTEGRATION DEBUG] ⚠️ POST /api/integrations - Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    console.log(`[PLATFORM INTEGRATION DEBUG] 🚀 Attempting connection for platform: "${body.platform}" | Account Name: "${body.account || body.accountName}" | Account ID: "${body.accountId}" | Workspace: ${session.workspaceId}`);

    const integration = await connectPersistedIntegrationCredentials({
      workspaceId: session.workspaceId,
      ...body
    });

    console.log(`[PLATFORM INTEGRATION DEBUG] 🟢 SUCCESS: Connected platform "${body.platform}" (ID: ${integration.id}) | Status: ${integration.status}`);
    return NextResponse.json(integration, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to connect integration";
    console.error(`[PLATFORM INTEGRATION DEBUG] 🔴 FAILURE: Failed to connect platform | Error: ${errorMsg}`);
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    console.warn("[PLATFORM INTEGRATION DEBUG] ⚠️ DELETE /api/integrations - Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Integration id is required" }, { status: 400 });

  console.log(`[PLATFORM INTEGRATION DEBUG] 🔌 Disconnecting integration ID: "${id}" for workspace: ${session.workspaceId}`);
  await prisma.integration.deleteMany({ where: { id, workspaceId: session.workspaceId } });
  console.log(`[PLATFORM INTEGRATION DEBUG] 🟢 Disconnected integration ID: "${id}" successfully.`);

  return NextResponse.json({ success: true, message: "Integration disconnected" });
}
