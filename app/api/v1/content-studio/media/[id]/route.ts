import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { objectStorage } from "@/lib/storage";
import { apiError, contentStudioContext, mediaDto, userNames } from "@/lib/content-studio-api";

const patchInput = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  folder: z.string().trim().max(80).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  isFavorite: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await contentStudioContext("content.edit");
  if ("response" in ctx) return ctx.response;
  const parsed = patchInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid media update.");
  const updated = await prisma.mediaAsset.updateMany({ where: { id: params.id, workspaceId: ctx.session.workspaceId }, data: parsed.data });
  if (!updated.count) return apiError("Media asset not found.", 404, "NOT_FOUND");
  const row = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: params.id } });
  return NextResponse.json({ data: mediaDto(row, await userNames([row.uploadedById])) });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await contentStudioContext("content.edit");
  if ("response" in ctx) return ctx.response;
  const row = await prisma.mediaAsset.findFirst({ where: { id: params.id, workspaceId: ctx.session.workspaceId } });
  if (!row) return apiError("Media asset not found.", 404, "NOT_FOUND");
  await prisma.mediaAsset.delete({ where: { id: row.id } });
  await objectStorage().delete(row.storageKey).catch((error) => console.error("Failed to delete stored media", row.storageKey, error));
  return NextResponse.json({ data: { deleted: row.id } });
}
