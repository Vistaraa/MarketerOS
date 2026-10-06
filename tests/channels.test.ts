import { describe, expect, it } from "vitest";
import { normalizeShopDomain } from "@/lib/integrations/channels";

describe("normalizeShopDomain", () => {
  it("accepts Shopify store domains in the forms people paste", () => {
    expect(normalizeShopDomain("acme.myshopify.com")).toBe("acme.myshopify.com");
    expect(normalizeShopDomain(" https://ACME-Store.myshopify.com/admin ")).toBe("acme-store.myshopify.com");
  });

  it("refuses anything that isn't a *.myshopify.com host (no SSRF)", () => {
    for (const bad of ["localhost", "127.0.0.1", "169.254.169.254", "acme.myshopify.com.evil.com", "evil.com/acme.myshopify.com", "acme.myshopify.com:8080", "-x.myshopify.com", "myshopify.com"]) {
      expect(() => normalizeShopDomain(bad), bad).toThrow(/myshopify\.com/);
    }
  });
});
