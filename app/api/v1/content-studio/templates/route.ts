import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, contentStudioContext, templateDto, templateFields, userNames } from "@/lib/content-studio-api";

export async function GET() {
  const ctx = await contentStudioContext("content.view");
  if ("response" in ctx) return ctx.response;
  const rows = await prisma.contentTemplate.findMany({ where: { workspaceId: ctx.session.workspaceId }, orderBy: { createdAt: "desc" } });
  const names = await userNames(rows.map((r) => r.createdById));
  return NextResponse.json({ data: { items: rows.map((r) => templateDto(r, names)) } });
}

export async function POST(request: Request) {
  const ctx = await contentStudioContext("content.edit");
  if ("response" in ctx) return ctx.response;
  const parsed = z.object(templateFields).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid template.");
  const { thumbnail, ...rest } = parsed.data;
  const row = await prisma.contentTemplate.create({
    data: { ...rest, thumbnailUrl: thumbnail || null, workspaceId: ctx.session.workspaceId, createdById: ctx.session.userId }
  });
  const names = await userNames([row.createdById]);
  return NextResponse.json({ data: templateDto(row, names) }, { status: 201 });
}
