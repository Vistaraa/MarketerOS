import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { objectStorage } from "@/lib/storage";
import { hitRateLimit } from "@/lib/rate-limit";
import { apiError, contentStudioContext, mediaDto, userNames } from "@/lib/content-studio-api";
import { ALLOWED_MEDIA_TYPES, MAX_UPLOAD_BYTES, contentMatchesType } from "@/lib/media-validation";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await contentStudioContext("content.view");
  if ("response" in ctx) return ctx.response;
  const rows = await prisma.mediaAsset.findMany({ where: { workspaceId: ctx.session.workspaceId }, orderBy: { createdAt: "desc" } });
  const names = await userNames(rows.map((r) => r.uploadedById));
  return NextResponse.json({ data: { items: rows.map((r) => mediaDto(r, names)) } });
}

const optionalNumber = (value: FormDataEntryValue | null) => {
  const n = value == null || value === "" ? NaN : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export async function POST(request: Request) {
  const ctx = await contentStudioContext("content.edit");
  if ("response" in ctx) return ctx.response;
  const { workspaceId, userId } = ctx.session;

  const limit = await hitRateLimit(`media-upload:ws:${workspaceId}`, 200, 60 * 60);
  if (!limit.allowed) return apiError("Upload limit reached. Please try again later.", 429, "RATE_LIMITED");

  // Reject oversized uploads before reading the body (and with a clear 413 rather than a parse failure).
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
    return apiError(`Files can be at most ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`, 413, "FILE_TOO_LARGE");
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) return apiError("Choose a file to upload.");
  if (file.size === 0) return apiError("The file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) return apiError(`Files can be at most ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`, 413, "FILE_TOO_LARGE");
  const extension = ALLOWED_MEDIA_TYPES[file.type];
  if (!extension) return apiError("Unsupported file type. Upload PNG, JPG, GIF, WEBP, MP4, MOV, WEBM or PDF.", 415, "UNSUPPORTED_TYPE");

  const body = Buffer.from(await file.arrayBuffer());
  if (!contentMatchesType(body, file.type)) return apiError("The file's contents don't match its type.", 415, "CONTENT_MISMATCH");

  const storageKey = `${workspaceId}/${randomBytes(16).toString("hex")}.${extension}`;
  await objectStorage().put(storageKey, body, file.type);

  const folder = String(form.get("folder") || "").trim().slice(0, 80) || null;
  const row = await prisma.mediaAsset.create({
    data: {
      workspaceId,
      uploadedById: userId,
      name: file.name.slice(0, 255) || `upload.${extension}`,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey,
      // Dimensions/duration are measured by the browser before upload; absent values stay null.
      width: optionalNumber(form.get("width")),
      height: optionalNumber(form.get("height")),
      durationSeconds: optionalNumber(form.get("duration")),
      folder
    }
  });
  return NextResponse.json({ data: mediaDto(row, await userNames([userId])) }, { status: 201 });
}
