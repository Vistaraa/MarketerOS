import { NextRequest } from "next/server";
import {
  connectIntegrationHandler,
  disconnectIntegrationHandler,
  getIntegrationsHandler
} from "@/controllers/integrations.controller";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return getIntegrationsHandler(req);
}

export async function POST(req: NextRequest) {
  return connectIntegrationHandler(req);
}

export async function DELETE(req: NextRequest) {
  return disconnectIntegrationHandler(req);
}
