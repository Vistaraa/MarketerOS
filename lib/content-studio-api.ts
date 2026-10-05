import { NextResponse } from "next/server";
import { z } from "zod";
import type { ContentTemplate, HashtagGroup, MediaAsset } from "@prisma/client";
import { can, getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export function apiError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Resolves the caller's workspace and checks a permission (e.g. "content.view" / "content.edit"). */
export async function contentStudioContext(permission: string) {
  const session = await getSession();
  if (!session) return { response: apiError("Authentication required.", 401, "UNAUTHENTICATED") } as const;
  if (!can(session.role, permission)) return { response: apiError("You do not have permission to perform this action.", 403, "FORBIDDEN") } as const;
  return { session } as const;
}

/** Display names for the given user ids, for "author" / "uploaded by" fields. */
export async function userNames(ids: Array<string | null>) {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  if (!unique.length) return new Map<string, { name: string; email: string }>();
  const users = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, firstName: true, lastName: true, email: true } });
  return new Map(users.map((u) => [u.id, { name: `${u.firstName} ${u.lastName}`.trim(), email: u.email }]));
}

type Names = Map<string, { name: string; email: string }>;
const person = (id: string | null, names: Names) => ({ id: id || "", name: (id && names.get(id)?.name) || "Unknown", role: "", email: (id && names.get(id)?.email) || "" });

export function templateDto(row: ContentTemplate, names: Names) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    platforms: row.platforms,
    thumbnail: row.thumbnailUrl || "",
    width: row.width ?? 1080,
    height: row.height ?? 1080,
    author: person(row.createdById, names),
    usageCount: row.usageCount,
    isFavorite: row.isFavorite,
    updatedAt: row.updatedAt.toISOString(),
    headline: row.headline ?? undefined,
    subheadline: row.subheadline ?? undefined,
    captionTemplate: row.captionTemplate ?? undefined,
    variables: row.variables
  };
}

export function mediaTypeFor(mimeType: string, name: string) {
  if (mimeType === "image/gif") return "GIF";
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType === "application/pdf" || name.toLowerCase().endsWith(".pdf")) return "Document";
  return "Document";
}

export function mediaDto(row: MediaAsset, names: Names) {
  const url = `/api/media/${row.id}`;
  const type = mediaTypeFor(row.mimeType, row.name);
  return {
    id: row.id,
    name: row.name,
    type,
    mimeType: row.mimeType,
    url,
    thumbnail: type === "Image" || type === "GIF" ? url : undefined,
    size: row.sizeBytes,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    duration: row.durationSeconds ?? undefined,
    folderId: row.folder ?? undefined,
    folderName: row.folder ?? undefined,
    tags: row.tags,
    uploadedBy: person(row.uploadedById, names),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isFavorite: row.isFavorite
  };
}

export function hashtagGroupDto(row: HashtagGroup) {
  return {
    id: row.id,
    name: row.name,
    hashtags: row.hashtags,
    usageCount: row.usageCount,
    // No hashtag performance data is collected, so none is reported (this used to be a made-up score).
    averagePerformance: null,
    lastUsed: row.lastUsedAt ? row.lastUsedAt.toISOString() : undefined,
    category: row.category ?? undefined
  };
}

/** Fields accepted when creating or updating a template. */
export const templateFields = {
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(60).optional(),
  platforms: z.array(z.string().max(40)).max(20).optional(),
  // Rendered in <img src>: only site-relative paths (e.g. uploaded media) or https URLs.
  thumbnail: z.string().max(2000).refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//")) || v.startsWith("https://"), "Thumbnail must be an uploaded file or an https URL.").optional(),
  width: z.number().int().positive().max(10000).optional(),
  height: z.number().int().positive().max(10000).optional(),
  headline: z.string().max(500).optional(),
  subheadline: z.string().max(500).optional(),
  captionTemplate: z.string().max(5000).optional(),
  variables: z.array(z.string().max(60)).max(30).optional(),
  isFavorite: z.boolean().optional(),
  usageCount: z.number().int().min(0).optional()
};
