/** /api/v1/search handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { cacheGetOrSet } from "@/lib/cache";
import { searchPersisted } from "@/lib/repositories";
import { ok, type V1Context } from "@/lib/api/v1/core";

export async function GET({ path, auth, listQuery, query }: V1Context): Promise<Response | null> {
  if (path === "search") {
    const key = `ws:${auth.session.workspaceId}:v1:search:${query}`;
    const items = await cacheGetOrSet(key, async () => searchPersisted(auth.session.workspaceId, query), 15_000);
    return ok({ items }, { page: listQuery.page, pageSize: listQuery.pageSize, total: items.length });
  }
  return null;
}
