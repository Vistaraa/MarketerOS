import { describe, expect, it } from "vitest";
import { paged, parseListQuery } from "../lib/api-contracts";
import { can } from "../lib/auth-server";

describe("API list contracts", () => {
  it("normalizes URL filters and pagination", () => {
    const query = parseListQuery(new Request("http://localhost/api/v1/campaigns?page=2&pageSize=10&status=Active&search=summer&order=asc"));
    expect(query).toMatchObject({ page: 2, pageSize: 10, status: "Active", search: "summer", order: "asc" });
  });

  it("returns a deterministic page without mutating the source", () => {
    const source = [1, 2, 3, 4, 5];
    expect(paged(source, { page: 2, pageSize: 2, search: "", q: "", status: "", platform: "", dateFrom: "", dateTo: "", sort: "updatedAt", order: "desc" })).toEqual({ items: [3, 4], total: 5 });
    expect(source).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("workspace permissions", () => {
  it("allows read access for analysts but blocks mutations", () => {
    expect(can("ANALYST", "analytics.view")).toBe(true);
    expect(can("ANALYST", "campaign.edit")).toBe(false);
  });

  it("keeps viewer access read-only", () => {
    expect(can("VIEWER", "campaign.view")).toBe(true);
    expect(can("VIEWER", "campaign.edit")).toBe(false);
  });
});
