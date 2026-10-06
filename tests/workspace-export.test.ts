import { describe, expect, it } from "vitest";
import { redact } from "@/lib/workspace-export";

describe("redact (workspace exports)", () => {
  it("drops credentials at any depth but keeps usage data", () => {
    const out = redact({
      apiKey: "x",
      accessTokenEncrypted: "x",
      refreshTokenEncrypted: "x",
      passwordHash: "x",
      stateHash: "x",
      razorpaySignature: "x",
      tokensTotal: 5,
      inputTokens: 3,
      hashtags: ["#launch"],
      metadata: { developerToken: "x", clientSecret: "x", private_key: "x", credentials: { a: 1 }, accountName: "kept", nested: [{ api_key: "x", name: "kept" }] }
    });
    expect(out).toEqual({ tokensTotal: 5, inputTokens: 3, hashtags: ["#launch"], metadata: { accountName: "kept", nested: [{ name: "kept" }] } });
  });

  it("serializes dates, BigInt and Decimal-like values", () => {
    const decimal = { toJSON: () => "12.50" };
    expect(redact({ at: new Date(0), big: BigInt(7), price: decimal })).toEqual({ at: "1970-01-01T00:00:00.000Z", big: 7, price: "12.50" });
  });
});
