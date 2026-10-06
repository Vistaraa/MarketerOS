import { describe, expect, it } from "vitest";
import { databaseUrlWarnings } from "@/lib/env-check";

describe("databaseUrlWarnings", () => {
  it("accepts a Supabase transaction-pooler URL with pgbouncer=true", () => {
    expect(databaseUrlWarnings("postgresql://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1", true)).toEqual([]);
  });

  it("flags a pooler URL without pgbouncer=true", () => {
    expect(databaseUrlWarnings("postgresql://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres", true)[0]).toMatch(/pgbouncer=true/);
  });

  it("flags a direct Supabase connection in production only", () => {
    const direct = "postgresql://u:p@db.abcd.supabase.co:5432/postgres";
    expect(databaseUrlWarnings(direct, true)[0]).toMatch(/transaction pooler/);
    expect(databaseUrlWarnings(direct, false)).toEqual([]);
  });

  it("is quiet for local development databases", () => {
    expect(databaseUrlWarnings("postgresql://postgres:x@localhost:5432/marketeros", false)).toEqual([]);
  });
});
