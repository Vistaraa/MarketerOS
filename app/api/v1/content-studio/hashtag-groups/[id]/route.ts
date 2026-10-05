import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, contentStudioContext, hashtagGroupDto } from "@/lib/content-studio-api";

const patchInput = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  hashtags: z.array(z.string().trim().min(1).max(100).transform((t) => (t.startsWith("#") ? t : `#${t}`))).min(1).max(60).optional(),
  category: z.string().trim().max(60).optional(),
  markUsed: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await contentStudioContext("content.edit");
  if ("response" in ctx) return ctx.response;
  const parsed = patchInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid hashtag group update.");
  const { markUsed, ...rest } = parsed.data;
  const updated = await prisma.hashtagGroup.updateMany({
    where: { id: params.id, workspaceId: ctx.session.workspaceId },
    data: { ...rest, ...(markUsed ? { usageCount: { increment: 1 }, lastUsedAt: new Date() } : {}) }
  });
  if (!updated.count) return apiError("Hashtag group not found.", 404, "NOT_FOUND");
  return NextResponse.json({ data: hashtagGroupDto(await prisma.hashtagGroup.findUniqueOrThrow({ where: { id: params.id } })) });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await contentStudioContext("content.edit");
  if ("response" in ctx) return ctx.response;
  const deleted = await prisma.hashtagGroup.deleteMany({ where: { id: params.id, workspaceId: ctx.session.workspaceId } });
  if (!deleted.count) return apiError("Hashtag group not found.", 404, "NOT_FOUND");
  return NextResponse.json({ data: { deleted: params.id } });
}
