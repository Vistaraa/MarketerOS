import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, contentStudioContext, templateDto, templateFields, userNames } from "@/lib/content-studio-api";

const patchInput = z.object(templateFields).partial().extend({ incrementUsage: z.boolean().optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await contentStudioContext("content.edit");
  if ("response" in ctx) return ctx.response;
  const parsed = patchInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid template update.");
  const { thumbnail, incrementUsage, ...rest } = parsed.data;
  const updated = await prisma.contentTemplate.updateMany({
    where: { id: id, workspaceId: ctx.session.workspaceId },
    data: { ...rest, ...(thumbnail !== undefined ? { thumbnailUrl: thumbnail || null } : {}), ...(incrementUsage ? { usageCount: { increment: 1 } } : {}) }
  });
  if (!updated.count) return apiError("Template not found.", 404, "NOT_FOUND");
  const row = await prisma.contentTemplate.findUniqueOrThrow({ where: { id: id } });
  return NextResponse.json({ data: templateDto(row, await userNames([row.createdById])) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await contentStudioContext("content.edit");
  if ("response" in ctx) return ctx.response;
  const deleted = await prisma.contentTemplate.deleteMany({ where: { id: id, workspaceId: ctx.session.workspaceId } });
  if (!deleted.count) return apiError("Template not found.", 404, "NOT_FOUND");
  return NextResponse.json({ data: { deleted: id } });
}
