import { NextResponse } from "next/server";
import { z } from "zod";
import { objectStorage } from "@/lib/storage";
import { hitRateLimit } from "@/lib/rate-limit";
import { apiError, contentStudioContext } from "@/lib/content-studio-api";
import { ALLOWED_MEDIA_TYPES, MAX_UPLOAD_BYTES } from "@/lib/media-validation";
import { createUploadTicket, newStorageKey } from "@/lib/media-upload";

export const runtime = "nodejs";

const PRESIGNED_URL_TTL_SECONDS = 10 * 60;

const input = z.object({
  name: z.string().trim().min(1).max(255),
  type: z.string(),
  size: z.number().int().positive(),
  folder: z.string().trim().max(80).optional().nullable(),
  width: z.number().positive().max(100_000).optional().nullable(),
  height: z.number().positive().max(100_000).optional().nullable(),
  duration: z.number().positive().max(86_400).optional().nullable()
});

/**
 * Step 1 of a direct upload: validate the file and return a presigned PUT URL plus a signed ticket.
 * Responds 409 DIRECT_UPLOAD_UNAVAILABLE with local storage; clients then use POST /media instead.
 */
export async function POST(request: Request) {
  const ctx = await contentStudioContext("content.edit");
  if ("response" in ctx) return ctx.response;
  const { workspaceId, userId } = ctx.session;

  const storage = objectStorage();
  if (!storage.direct) return apiError("Direct uploads need S3 storage; upload through the app instead.", 409, "DIRECT_UPLOAD_UNAVAILABLE");

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid upload request.");
  const file = parsed.data;
  if (!ALLOWED_MEDIA_TYPES[file.type]) return apiError("Unsupported file type. Upload PNG, JPG, GIF, WEBP, MP4, MOV, WEBM or PDF.", 415, "UNSUPPORTED_TYPE");
  if (file.size > MAX_UPLOAD_BYTES) return apiError(`Files can be at most ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`, 413, "FILE_TOO_LARGE");

  const limit = await hitRateLimit(`media-upload:ws:${workspaceId}`, 200, 60 * 60);
  if (!limit.allowed) return apiError("Upload limit reached. Please try again later.", 429, "RATE_LIMITED");

  const key = newStorageKey(workspaceId, file.type);
  const uploadUrl = await storage.direct.presignPut(key, file.type, file.size, PRESIGNED_URL_TTL_SECONDS);
  const ticket = createUploadTicket({
    workspaceId,
    userId,
    key,
    name: file.name,
    mimeType: file.type,
    size: file.size,
    folder: file.folder || null,
    width: file.width ?? null,
    height: file.height ?? null,
    duration: file.duration ?? null
  });

  return NextResponse.json({
    data: { uploadUrl, method: "PUT", headers: { "Content-Type": file.type }, token: ticket.token, expiresAt: ticket.expiresAt.toISOString() }
  });
}
