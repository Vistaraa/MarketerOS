import { describe, expect, it } from "vitest";
import { getProvider } from "@/lib/integrations/provider";

describe("getProvider", () => {
  it("resolves database platform values, provider keys and display names alike", () => {
    expect(getProvider("META_ADS").providerKey).toBe("meta_ads");
    expect(getProvider("GOOGLE_ADS").providerKey).toBe("google_ads");
    expect(getProvider("google_ads").providerKey).toBe("google_ads");
    expect(getProvider("Meta Ads").providerKey).toBe("meta_ads");
    expect(getProvider("FIREBASE_ADMOB").providerKey).toBe("google_admob");
  });

  it("only ad platforms sync metrics", () => {
    expect(getProvider("META_ADS").supportsMetrics).toBe(true);
    expect(getProvider("GOOGLE_ADS").supportsMetrics).toBe(true);
    expect(getProvider("INSTAGRAM").supportsMetrics).toBe(false);
    expect(getProvider("google_analytics").supportsMetrics).toBe(false);
  });

  it("Google refreshes access tokens; Meta doesn't need to", () => {
    expect(typeof getProvider("GOOGLE_ADS").refreshAccessToken).toBe("function");
    expect(getProvider("META_ADS").refreshAccessToken).toBeUndefined();
  });
});
