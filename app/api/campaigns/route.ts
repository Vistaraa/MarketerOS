import { NextRequest, NextResponse } from "next/server";
import { publicErrorMessage } from "@/lib/errors";
import { z } from "zod";
import { can, getSession } from "@/lib/auth-server";
import { subscriptionWriteGuard } from "@/lib/subscription";
import { planLimitGuard } from "@/lib/plan-limits";
import { listPersistedCampaigns, createPersistedCampaign } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaigns = await listPersistedCampaigns(session.workspaceId);
  return NextResponse.json(campaigns);
}

// Only these fields are accepted: the workspace and author always come from the session, never the body.
const campaignBody = z.object({
  name: z.string().trim().min(1).max(200),
  platform: z.string().min(1),
  objective: z.string().min(1),
  budget: z.coerce.number().nonnegative(),
  dailyBudget: z.coerce.number().nonnegative().optional(),
  targetRoas: z.coerce.number().nonnegative().optional(),
  targetCpa: z.coerce.number().nonnegative().optional(),
  biddingStrategy: z.string().max(100).optional()
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "campaign.edit")) return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
  const blocked = (await subscriptionWriteGuard(session.workspaceId)) || (await planLimitGuard(session.workspaceId, "campaigns"));
  if (blocked) return blocked;
  try {
    const parsed = campaignBody.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid campaign." }, { status: 400 });
    const created = await createPersistedCampaign({
      ...parsed.data,
      workspaceId: session.workspaceId,
      createdById: session.userId
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: publicErrorMessage(err, "Failed to create campaign", "campaigns") }, { status: 400 });
  }
}
