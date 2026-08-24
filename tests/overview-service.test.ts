import { describe, expect, it } from "vitest";
import { parseOverviewQuery } from "../lib/overview-service";

function query(search = "") {
  return new Request(`http://localhost/api/v1/overview${search ? `?${search}` : ""}`);
}

describe("Overview data service", () => {
  it("parses the persisted overview defaults", () => {
    const parsed = parseOverviewQuery(query());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toMatchObject({ dateFrom: "2024-05-01", dateTo: "2024-05-31", granularity: "daily", platform: "", status: "" });
  });

  it("accepts deep-linkable granularity and filters", () => {
    const weekly = parseOverviewQuery(query("granularity=weekly"));
    const monthly = parseOverviewQuery(query("granularity=monthly"));
    expect(weekly.success && weekly.data.granularity).toBe("weekly");
    expect(monthly.success && monthly.data.granularity).toBe("monthly");
  });

  it("preserves platform, status, and search filters", () => {
    const parsed = parseOverviewQuery(query("platform=Google%20Ads&status=Paused&search=product"));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toMatchObject({ platform: "Google Ads", status: "Paused", search: "product" });
  });

  it("rejects invalid and reversed date ranges", () => {
    expect(parseOverviewQuery(query("dateFrom=2024-06-01&dateTo=2024-05-01"))).toMatchObject({ success: false });
    expect(parseOverviewQuery(query("dateFrom=not-a-date"))).toMatchObject({ success: false });
  });
});
