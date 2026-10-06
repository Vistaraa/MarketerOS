import { NextResponse } from "next/server";
import { logServerError } from "@/lib/errors";
import { can, getSession } from "@/lib/auth-server";
import { getDecryptedGooglePlayIntegration } from "@/lib/google/play-console";
import { subscriptionWriteGuard } from "@/lib/subscription";
import { enqueueJob } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

/** Queues an import of releases, reviews and Android vitals from Google Play (also runs daily on its own). */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!can(session.role, "settings.manage")) return NextResponse.json({ error: "You do not have permission to sync integrations." }, { status: 403 });
    const lapsed = await subscriptionWriteGuard(session.workspaceId);
    if (lapsed) return lapsed;

    const decrypted = await getDecryptedGooglePlayIntegration(session.workspaceId);
    if (!decrypted) {
      return NextResponse.json(
        { error: "Google Play isn't connected yet. Add your Play Console credentials with BYOK Keys first." },
        { status: 409 }
      );
    }
    const running = await prisma.backgroundJob.findFirst({ where: { workspaceId: session.workspaceId, name: "play.import", status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true } });
    const job = running || (await enqueueJob("play.import", { workspaceId: session.workspaceId, integrationId: decrypted.integrationId }));
    return NextResponse.json({
      success: true,
      queued: true,
      jobId: job.id,
      message: `Importing releases, reviews and vitals for ${decrypted.packageName || "your app"}. This usually takes under a minute.`
    }, { status: 202 });
  } catch (error: any) {
    return NextResponse.json({ error: logServerError("v1/play-console/sync", "Failed to sync Google Play Console.", error) }, { status: 500 });
  }
}
