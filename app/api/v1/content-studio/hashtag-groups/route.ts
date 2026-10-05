import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, contentStudioContext, hashtagGroupDto } from "@/lib/content-studio-api";

const hashtag = z.string().trim().min(1).max(100).transform((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
const createInput = z.object({
  name: z.string().trim().min(1).max(120),
  hashtags: z.array(hashtag).min(1).max(60),
  category: z.string().trim().max(60).optional(),
  usageCount: z.number().int().min(0).optional()
});

export async function GET() {
  const ctx = await contentStudioContext("content.view");
  if ("response" in ctx) return ctx.response;
  const rows = await prisma.hashtagGroup.findMany({ where: { workspaceId: ctx.session.workspaceId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: { items: rows.map(hashtagGroupDto) } });
}

export async function POST(request: Request) {
  const ctx = await contentStudioContext("content.edit");
  if ("response" in ctx) return ctx.response;
  const parsed = createInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid hashtag group.");
  const row = await prisma.hashtagGroup.create({ data: { ...parsed.data, category: parsed.data.category || "Custom", workspaceId: ctx.session.workspaceId } });
  return NextResponse.json({ data: hashtagGroupDto(row) }, { status: 201 });
}
