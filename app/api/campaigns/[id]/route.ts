import { NextRequest } from "next/server";
import {
  deleteCampaignHandler,
  getCampaignDetailHandler,
  updateCampaignHandler
} from "@/controllers/campaigns.controller";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return getCampaignDetailHandler(req, { params });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return updateCampaignHandler(req, { params });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return deleteCampaignHandler(req, { params });
}
