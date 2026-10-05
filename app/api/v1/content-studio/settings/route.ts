import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, contentStudioContext } from "@/lib/content-studio-api";

export async function GET() {
  const ctx = await contentStudioContext("content.view");
  if ("response" in ctx) return ctx.response;
  const workspace = await prisma.workspace.findUnique({ where: { id: ctx.session.workspaceId }, select: { contentStudioSettings: true } });
  return NextResponse.json({ data: { settings: workspace?.contentStudioSettings ?? null } });
}

export async function PUT(request: Request) {
  const ctx = await contentStudioContext("content.edit");
  if ("response" in ctx) return ctx.response;
  const parsed = z.object({ settings: z.record(z.unknown()) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("Invalid settings.");
  if (JSON.stringify(parsed.data.settings).length > 20_000) return apiError("Settings are too large.", 413);
  await prisma.workspace.update({ where: { id: ctx.session.workspaceId }, data: { contentStudioSettings: parsed.data.settings as never } });
  return NextResponse.json({ data: { settings: parsed.data.settings } });
}
