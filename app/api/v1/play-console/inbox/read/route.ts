import { NextResponse } from "next/server";
import { logServerError } from "@/lib/errors";
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
    const { messageId, markAll, isRead = true } = body;

    if (markAll) {
      await prisma.playConsoleInboxMessage.updateMany({
        where: { workspaceId, isRead: false },
        data: { isRead: true }
      });
      return NextResponse.json({ success: true, message: "All developer inbox notifications marked as read." });
    }

    if (!messageId) {
      return NextResponse.json({ error: "Message ID is required." }, { status: 400 });
    }

    const updated = await prisma.playConsoleInboxMessage.updateMany({
      where: { id: messageId, workspaceId },
      data: { isRead }
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (error: any) {
    return NextResponse.json({ error: logServerError("v1/play-console/inbox/read", "Failed to update inbox message status.", error) }, { status: 500 });
  }
}
