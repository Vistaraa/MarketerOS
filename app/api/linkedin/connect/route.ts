import { NextRequest } from "next/server";
import { connectChannel } from "@/lib/integrations/channel-connect";

export const runtime = "nodejs";

/** Verifies and saves a pasted access token, then queues the first metrics sync. */
export async function POST(req: NextRequest) {
  return connectChannel(req, "linkedin_ads");
}
