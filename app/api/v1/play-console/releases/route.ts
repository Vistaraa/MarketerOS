import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { ensurePlayConsoleData } from "@/lib/google/play-console";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = session;
    const url = new URL(request.url);
    const packageNameParam = url.searchParams.get("packageName");
    const clientIdParam = url.searchParams.get("clientId");

    const app = await ensurePlayConsoleData(workspaceId, clientIdParam || undefined);
    const activeApp = clientIdParam
      ? await prisma.playConsoleApp.findFirst({ where: { workspaceId, clientId: clientIdParam } }) || app
      : packageNameParam
      ? await prisma.playConsoleApp.findFirst({ where: { workspaceId, packageName: packageNameParam } }) || app
      : app;

    const releases = await prisma.playConsoleRelease.findMany({
      where: { workspaceId, appId: activeApp.id },
      orderBy: { releasedAt: "desc" }
    });

    const formattedReleases = releases.map((r) => {
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - new Date(r.releasedAt).getTime()) / (1000 * 3600));
      let timeAgo = `${diffHours} hours ago`;
      if (diffHours >= 24 && diffHours < 48) {
        timeAgo = "Yesterday";
      } else if (diffHours >= 48) {
        const days = Math.floor(diffHours / 24);
        timeAgo = days > 7 ? `${Math.floor(days / 7)} weeks ago` : `${days} days ago`;
      }

      return {
        id: r.id,
        track: r.track,
        versionCode: r.versionCode,
        versionName: r.versionName,
        rolloutPercentage: Number(r.rolloutPercentage),
        status: r.status,
        targetDevices: r.targetDevices,
        notes: r.notes,
        releasedAt: r.releasedAt,
        timeAgo
      };
    });

    // Group by track
    const production = formattedReleases.filter((r) => r.track === "PRODUCTION");
    const openTesting = formattedReleases.filter((r) => r.track === "OPEN_TESTING");
    const closedTesting = formattedReleases.filter((r) => r.track === "CLOSED_TESTING");
    const internalTesting = formattedReleases.filter((r) => r.track === "INTERNAL_TESTING");

    return NextResponse.json({
      app: {
        id: activeApp.id,
        packageName: activeApp.packageName,
        appTitle: activeApp.appTitle
      },
      tracks: {
        production,
        openTesting,
        closedTesting,
        internalTesting
      },
      allReleases: formattedReleases
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch releases." }, { status: 500 });
  }
}
