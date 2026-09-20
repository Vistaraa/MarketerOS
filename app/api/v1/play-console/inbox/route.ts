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
    const clientIdParam = url.searchParams.get("clientId");

    const app = await ensurePlayConsoleData(workspaceId, clientIdParam || undefined);

    const messages = await prisma.playConsoleInboxMessage.findMany({
      where: {
        workspaceId,
        ...(clientIdParam ? { appId: app.id } : {})
      },
      orderBy: { receivedAt: "desc" }
    });

    const formattedMessages = messages.map((m) => ({
      id: m.id,
      category: m.category,
      title: m.title,
      summary: m.summary,
      body: m.body,
      severity: m.severity,
      actionUrl: m.actionUrl,
      isRead: m.isRead,
      dateLabel: new Date(m.receivedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      receivedAt: m.receivedAt
    }));

    const important = formattedMessages.filter((m) => m.category === "IMPORTANT");
    const everythingElse = formattedMessages.filter((m) => m.category === "EVERYTHING_ELSE");

    return NextResponse.json({
      important,
      everythingElse,
      unreadCount: messages.filter((m) => !m.isRead).length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch inbox." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = session;
    const body = await request.json();
    const { messageId, markAllRead } = body;

    if (markAllRead) {
      await prisma.playConsoleInboxMessage.updateMany({
        where: { workspaceId },
        data: { isRead: true }
      });
    } else if (messageId) {
      await prisma.playConsoleInboxMessage.update({
        where: { id: messageId },
        data: { isRead: true }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update inbox message." }, { status: 500 });
  }
}
