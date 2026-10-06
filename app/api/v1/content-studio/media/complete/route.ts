import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { objectStorage } from "@/lib/storage";
import { apiError, contentStudioContext, mediaDto, userNames } from "@/lib/content-studio-api";
import { contentMatchesType } from "@/lib/media-validation";
import { readUploadTicket } from "@/lib/media-upload";

export const runtime = "nodejs";

/**
 * Step 2 of a direct upload: verify what actually landed in storage, then register it.
 * Anything that doesn't match the ticket (size, file signature) is deleted rather than kept.
 */
export async function POST(request: Request) {
  const ctx = await contentStudioContext("content.edit");
  if ("response" in ctx) return ctx.response;
  const { workspaceId } = ctx.session;

  const storage = objectStorage();
  if (!storage.direct) return apiError("Direct uploads need S3 storage.", 409, "DIRECT_UPLOAD_UNAVAILABLE");

  const parsed = z.object({ token: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("Upload ticket is required.");
  const ticket = readUploadTicket(parsed.data.token);
  // A ticket is bound to the workspace that requested it, and expires.
  if (!ticket || ticket.workspaceId !== workspaceId) return apiError("This upload has expired or is invalid. Please upload the file again.", 400, "INVALID_UPLOAD_TICKET");

  const existing = await prisma.mediaAsset.findUnique({ where: { storageKey: ticket.key } });
  if (existing) return apiError("This upload has already been completed.", 409, "UPLOAD_ALREADY_COMPLETED");

  const stored = await storage.direct.inspect(ticket.key, 16);
  if (!stored) return apiError("The file wasn't found in storage. Please upload it again.", 400, "UPLOAD_NOT_FOUND");
  if (stored.size !== ticket.size || !contentMatchesType(stored.head, ticket.mimeType)) {
    await storage.delete(ticket.key).catch((error) => console.error("Failed to delete rejected upload", ticket.key, error));
    return apiError("The uploaded file doesn't match what was declared and was discarded.", 415, "CONTENT_MISMATCH");
  }

  let row;
  try {
    row = await prisma.mediaAsset.create({
      data: {
        workspaceId,
        uploadedById: ticket.userId,
        name: ticket.name,
        mimeType: ticket.mimeType,
        sizeBytes: ticket.size,
        storageKey: ticket.key,
        width: ticket.width,
        height: ticket.height,
        durationSeconds: ticket.duration,
        folder: ticket.folder
      }
    });
  } catch (error) {
    // Two concurrent completions of the same ticket: the storage key is unique, so only one wins.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("This upload has already been completed.", 409, "UPLOAD_ALREADY_COMPLETED");
    }
    throw error;
  }
  return NextResponse.json({ data: mediaDto(row, await userNames([ticket.userId])) }, { status: 201 });
}
