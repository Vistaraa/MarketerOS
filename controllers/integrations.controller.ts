import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";
import {
  connectPlatformCredentials,
  getWorkspaceIntegrations,
  removeIntegration
} from "@/services/integrations.service";

const integrationCredentialInput = z.object({
  platform: z.string().min(2),
  accountName: z.string().min(1),
  accountId: z.string().min(1),
  apiKey: z.string().min(1, "API Key / Access Token is required to authenticate with this platform."),
  apiSecret: z.string().optional(),
  developerToken: z.string().optional(),
  propertyId: z.string().optional(),
  siteUrl: z.string().optional(),
  appId: z.string().optional(),
  channelId: z.string().optional(),
  locationId: z.string().optional(),
  pixelId: z.string().optional(),
  phoneNumberId: z.string().optional(),
  pageId: z.string().optional(),
  adAccountId: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  refreshToken: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export async function getIntegrationsHandler(_req: NextRequest) {
  try {
    const session = await requireTenant();
    const items = await getWorkspaceIntegrations(session.workspaceId);
    return NextResponse.json({ data: { items }, error: null }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { data: null, error: { message: err instanceof Error ? err.message : "Failed to fetch integrations" } },
      { status: 500 }
    );
  }
}

export async function connectIntegrationHandler(req: NextRequest) {
  try {
    const session = await requireTenant();

    const body = await req.json();
    const parsed = integrationCredentialInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { message: parsed.error.issues[0]?.message || "Invalid credentials." } },
        { status: 400 }
      );
    }

    const result = await connectPlatformCredentials(session.workspaceId, parsed.data);

    await recordAudit({
      workspaceId: session.workspaceId,
      userId: session.userId,
      action: "CONNECT",
      module: "integrations",
      entityType: "Integration",
      entityId: result.id,
      afterData: result
    });

    return NextResponse.json({ data: result, error: null }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { data: null, error: { message: err instanceof Error ? err.message : "Failed to connect integration" } },
      { status: 500 }
    );
  }
}

export async function disconnectIntegrationHandler(req: NextRequest) {
  try {
    const session = await requireTenant();

    const body = await req.json();
    const parsed = z.object({ integrationId: z.string().min(1) }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { message: "Integration ID is required." } },
        { status: 400 }
      );
    }

    await removeIntegration(session.workspaceId, parsed.data.integrationId);

    await recordAudit({
      workspaceId: session.workspaceId,
      userId: session.userId,
      action: "DISCONNECT",
      module: "integrations",
      entityType: "Integration",
      entityId: parsed.data.integrationId
    });

    return NextResponse.json({ data: { success: true, message: "Integration disconnected." }, error: null }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { data: null, error: { message: err instanceof Error ? err.message : "Failed to disconnect integration" } },
      { status: 500 }
    );
  }
}
