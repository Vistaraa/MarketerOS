/** /api/v1/overview handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { cacheGetOrSet } from "@/lib/cache";
import { buildPersistedOverview, parseOverviewQuery } from "@/lib/overview-service";
import { ok, error, type V1Context } from "@/lib/api/v1/core";

export async function GET({ request, url, path, auth, listQuery }: V1Context): Promise<Response | null> {
  if (path === "overview" || path === "analytics/overview") {
    const parsed = parseOverviewQuery(request);
    if (!parsed.success) return error(parsed.message, 400, "INVALID_OVERVIEW_QUERY");
    const key = `ws:${auth.session.workspaceId}:v1:${path}:${url.search}`;
    const data = await cacheGetOrSet(key, () => buildPersistedOverview(auth.session.workspaceId, parsed.data), 30_000);
    return ok(data);
  }
  if (["analytics", "ad-manager", "social-media"].includes(path)) return ok({ items: [], filters: listQuery });
  return null;
}
