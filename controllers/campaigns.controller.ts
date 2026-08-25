import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";
import {
  changeCampaignStatus,
  createNewCampaign,
  getCampaignDetails,
  getWorkspaceCampaigns,
  modifyCampaign,
  removeCampaign
} from "@/services/campaigns.service";

const campaignInput = z.object({
  name: z.string().min(2, "Campaign name must be at least 2 characters."),
  objective: z.string().min(2, "Objective is required."),
  platform: z.string().optional(),
  platforms: z.array(z.string()).optional(),
  budget: z.coerce.number().positive("Budget must be positive."),
  dailyBudget: z.coerce.number().positive().optional(),
  targetRoas: z.coerce.number().positive().optional(),
  targetCpa: z.coerce.number().positive().optional(),
  biddingStrategy: z.string().optional(),
  integrationId: z.string().optional()
});

const campaignUpdateInput = z.object({
  name: z.string().optional(),
  budget: z.coerce.number().positive().optional(),
  dailyBudget: z.coerce.number().positive().optional(),
  targetRoas: z.coerce.number().positive().optional(),
  biddingStrategy: z.string().optional(),
  status: z.string().optional()
});

export async function getCampaignsHandler(_req: NextRequest) {
  try {
    const session = await requireTenant();
    const items = await getWorkspaceCampaigns(session.workspaceId);
    return NextResponse.json({ data: { items }, error: null }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { data: null, error: { message: err instanceof Error ? err.message : "Failed to fetch campaigns" } },
      { status: 500 }
    );
  }
}

export async function getCampaignDetailHandler(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireTenant();
    const detail = await getCampaignDetails(session.workspaceId, params.id);
    return NextResponse.json({ data: detail, error: null }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { data: null, error: { message: err instanceof Error ? err.message : "Campaign not found" } },
      { status: 404 }
    );
  }
}

export async function createCampaignHandler(req: NextRequest) {
  try {
    const session = await requireTenant();

    const body = await req.json();
    const parsed = campaignInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { message: parsed.error.issues[0]?.message || "Invalid campaign data." } },
        { status: 400 }
      );
    }

    const campaign = await createNewCampaign(session.workspaceId, session.userId, parsed.data);

    await recordAudit({
      workspaceId: session.workspaceId,
      userId: session.userId,
      action: "CREATE",
      module: "campaigns",
      entityType: "Campaign",
      entityId: campaign.id,
      afterData: campaign
    });

    return NextResponse.json({ data: campaign, error: null }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { data: null, error: { message: err instanceof Error ? err.message : "Failed to create campaign" } },
      { status: 400 }
    );
  }
}

export async function updateCampaignHandler(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireTenant();

    const body = await req.json();
    const parsed = campaignUpdateInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { message: parsed.error.issues[0]?.message || "Invalid update data." } },
        { status: 400 }
      );
    }

    if (parsed.data.status) {
      await changeCampaignStatus(session.workspaceId, params.id, parsed.data.status);
    } else {
      await modifyCampaign(session.workspaceId, params.id, parsed.data);
    }

    return NextResponse.json({ data: { success: true }, error: null }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { data: null, error: { message: err instanceof Error ? err.message : "Failed to update campaign" } },
      { status: 500 }
    );
  }
}

export async function deleteCampaignHandler(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireTenant();
    await removeCampaign(session.workspaceId, params.id);
    return NextResponse.json({ data: { success: true }, error: null }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { data: null, error: { message: err instanceof Error ? err.message : "Failed to delete campaign" } },
      { status: 500 }
    );
  }
}
