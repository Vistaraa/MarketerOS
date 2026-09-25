import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = session;
    const body = await request.json();
    const { releaseId, rolloutPercentage, status } = body;

    if (!releaseId) {
      return NextResponse.json({ error: "Release ID is required" }, { status: 400 });
    }

    const existing = await prisma.playConsoleRelease.findFirst({
      where: { id: releaseId, workspaceId }
    });

    if (!existing) {
      return NextResponse.json({ error: "Release track not found." }, { status: 404 });
    }

    let nextStatus = status || existing.status;
    let nextRollout = rolloutPercentage !== undefined ? Number(rolloutPercentage) : Number(existing.rolloutPercentage);

    if (nextRollout >= 100) {
      nextRollout = 100;
      nextStatus = "COMPLETED";
    }

    const updated = await prisma.playConsoleRelease.update({
      where: { id: releaseId },
      data: {
        rolloutPercentage: nextRollout,
        status: nextStatus
      }
    });

    return NextResponse.json({
      success: true,
      message: `Updated release v${updated.versionName} rollout to ${updated.rolloutPercentage}%.`,
      data: updated
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update release rollout." }, { status: 500 });
  }
}
