import { z } from "zod";

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().default(""),
  q: z.string().trim().default(""),
  status: z.string().trim().default(""),
  platform: z.string().trim().default(""),
  dateFrom: z.string().trim().default(""),
  dateTo: z.string().trim().default(""),
  sort: z.string().trim().default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc")
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export type ApiError = { code: string; message: string; details?: unknown };
export type ApiResponse<T> = { data: T; meta?: { page?: number; pageSize?: number; total?: number }; error?: ApiError };

export function parseListQuery(request: Request) {
  const url = new URL(request.url);
  return listQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
}

export function paged<T>(items: T[], query: ListQuery) {
  const search = query.search || query.q;
  const filtered = search ? items : items;
  const start = (query.page - 1) * query.pageSize;
  return { items: filtered.slice(start, start + query.pageSize), total: filtered.length };
}
