import { NextResponse } from "next/server";
import { logServerError } from "@/lib/errors";
import { getSession } from "@/lib/auth-server";
import { getDecryptedGooglePlayIntegration } from "@/lib/google/play-console";
import { subscriptionWriteGuard } from "@/lib/subscription";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const lapsed = await subscriptionWriteGuard(session.workspaceId);
    if (lapsed) return lapsed;

    const decrypted = await getDecryptedGooglePlayIntegration(session.workspaceId);
    if (!decrypted) {
      return NextResponse.json(
        { error: "Google Play isn't connected yet. Add your Play Console credentials with BYOK Keys first." },
        { status: 409 }
      );
    }

    // There is no importer for Play Console releases, inbox or KPIs yet. Say so instead of
    // reporting a successful sync (this route used to regenerate synthetic metrics here).
    return NextResponse.json({
      success: true,
      imported: false,
      message: `Connected to ${decrypted.packageName || "your app"}. Importing releases, inbox messages and KPIs from Google Play isn't available yet, so no data was synced.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: logServerError("v1/play-console/sync", "Failed to sync Google Play Console.", error) }, { status: 500 });
  }
}
