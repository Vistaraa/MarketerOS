import { describe, expect, it, afterEach } from "vitest";
import { decryptSecret, encryptSecret } from "../lib/crypto";
import { getProvider, providerConfiguration } from "../lib/integrations/provider";

const original = { encryption: process.env.ENCRYPTION_KEY, googleId: process.env.GOOGLE_CLIENT_ID, googleSecret: process.env.GOOGLE_CLIENT_SECRET, developer: process.env.GOOGLE_ADS_DEVELOPER_TOKEN };

afterEach(() => {
  process.env.ENCRYPTION_KEY = original.encryption;
  process.env.GOOGLE_CLIENT_ID = original.googleId;
  process.env.GOOGLE_CLIENT_SECRET = original.googleSecret;
  process.env.GOOGLE_ADS_DEVELOPER_TOKEN = original.developer;
});

describe("server-side secrets", () => {
  it("encrypts and decrypts provider tokens with authenticated encryption", () => {
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const encrypted = encryptSecret("access-token");
    expect(encrypted).not.toContain("access-token");
    expect(decryptSecret(encrypted)).toBe("access-token");
    const parts = encrypted.split("."); parts[1] = `${parts[1]}x`;
    expect(() => decryptSecret(parts.join("."))).toThrow();
  });

  it("reports partial provider configuration instead of creating a fake adapter", () => {
    delete process.env.GOOGLE_CLIENT_ID; delete process.env.GOOGLE_CLIENT_SECRET; delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    expect(providerConfiguration("google_ads")).toMatchObject({ configured: false });
    expect(() => getProvider("google_ads")).toThrow(/configuration required/i);
  });
});
