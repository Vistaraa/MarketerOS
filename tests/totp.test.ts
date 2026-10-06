import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, matchTotp, totpAt } from "@/lib/totp";

// RFC 6238 Appendix B (SHA-1 seed "12345678901234567890"); authenticator apps show the last 6 digits.
const SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("TOTP", () => {
  it("matches the RFC 6238 test vectors", () => {
    expect(SECRET).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(totpAt(SECRET, Math.floor(59 / 30))).toBe("287082");
    expect(totpAt(SECRET, Math.floor(1111111109 / 30))).toBe("081804");
    expect(totpAt(SECRET, Math.floor(1234567890 / 30))).toBe("005924");
    expect(totpAt(SECRET, Math.floor(2000000000 / 30))).toBe("279037");
  });

  it("round-trips base32", () => {
    const bytes = Buffer.from([0, 1, 2, 250, 255, 7]);
    expect(base32Decode(base32Encode(bytes)).equals(bytes)).toBe(true);
  });

  it("accepts one step of clock drift, and rejects anything else", () => {
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 30000);
    expect(matchTotp(SECRET, totpAt(SECRET, step), now)).toBe(step);
    expect(matchTotp(SECRET, totpAt(SECRET, step - 1), now)).toBe(step - 1);
    expect(matchTotp(SECRET, totpAt(SECRET, step + 1), now)).toBe(step + 1);
    expect(matchTotp(SECRET, totpAt(SECRET, step - 2), now)).toBeNull();
    expect(matchTotp(SECRET, "12345", now)).toBeNull();
    expect(matchTotp(SECRET, "abcdef", now)).toBeNull();
  });
});
