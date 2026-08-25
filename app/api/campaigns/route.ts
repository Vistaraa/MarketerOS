import { NextRequest } from "next/server";
import {
  createCampaignHandler,
  getCampaignsHandler
} from "@/controllers/campaigns.controller";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return getCampaignsHandler(req);
}

export async function POST(req: NextRequest) {
  return createCampaignHandler(req);
}
