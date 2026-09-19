import { describe, expect, it } from "vitest";
import { compactNumber, money, slugify } from "../lib/utils";

describe("MarketerOS formatting helpers", () => {
  it("formats currency consistently", () => expect(money(42890)).toBe("$42,890"));
  it("formats compact analytics values", () => expect(compactNumber(86420)).toBe("86.4K"));
  it("creates stable workspace slugs", () => expect(slugify("Northstar Labs / Growth")).toBe("northstar-labs-growth"));
});
