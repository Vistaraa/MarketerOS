import { prisma } from "@/lib/prisma";
import { objectStorage } from "@/lib/storage";
import { apiError, contentStudioContext } from "@/lib/content-studio-api";

export const runtime = "nodejs";

/** Serves an uploaded file to members of the workspace that owns it. */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const ctx = await contentStudioContext("content.view");
  if ("response" in ctx) return ctx.response;
  const asset = await prisma.mediaAsset.findFirst({ where: { id: params.id, workspaceId: ctx.session.workspaceId } });
  if (!asset) return apiError("Media asset not found.", 404, "NOT_FOUND");
  const stored = await objectStorage().get(asset.storageKey);
  if (!stored) return apiError("The file for this asset is missing from storage.", 404, "NOT_FOUND");

  const download = new URL(request.url).searchParams.get("download") === "1";
  const filename = asset.name.replace(/[^\w.\- ]+/g, "_");
  return new Response(new Uint8Array(stored.body), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(stored.body.byteLength),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
      // Even if a file were mislabelled, it can't run as a page on this origin.
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
