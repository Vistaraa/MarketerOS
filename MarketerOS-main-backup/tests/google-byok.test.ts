import { describe, expect, it } from "vitest";
import {
  encryptCredentialFields,
  formatCustomerId,
  formatPublisherResource,
  createDynamicAuthClient
} from "../lib/google";
import { decryptSecret } from "../lib/crypto";

describe("Google BYOK dynamic integration system", () => {
  it("formats Google Ads customer ID stripping dashes and spaces", () => {
    expect(formatCustomerId("123-456-7890")).toBe("1234567890");
    expect(formatCustomerId(" 987-654-3210 ")).toBe("9876543210");
    expect(formatCustomerId("3049938456")).toBe("3049938456");
  });

  it("formats AdMob publisher ID correctly", () => {
    const formatted = formatPublisherResource("pub-1234567890123456");
    expect(formatted.formattedId).toBe("pub-1234567890123456");
    expect(formatted.resourceName).toBe("accounts/pub-1234567890123456");

    const noPrefix = formatPublisherResource("1234567890123456");
    expect(noPrefix.formattedId).toBe("pub-1234567890123456");
    expect(noPrefix.resourceName).toBe("accounts/pub-1234567890123456");
  });

  it("encrypts all sensitive BYOK fields using AES-256-GCM", () => {
    const encrypted = encryptCredentialFields({
      developerToken: "test-dev-token-999",
      clientId: "test-client-id.apps.googleusercontent.com",
      clientSecret: "test-secret-xyz",
      refreshToken: "1//test-refresh-token",
      serviceAccountJson: '{"type":"service_account","project_id":"my-proj"}',
      measurementSecret: "secret-ga4-123"
    });

    expect(encrypted.metadataEncrypted.developerTokenEncrypted).toBeDefined();
    expect(encrypted.metadataEncrypted.developerTokenEncrypted).not.toContain("test-dev-token-999");
    expect(decryptSecret(encrypted.metadataEncrypted.developerTokenEncrypted!)).toBe("test-dev-token-999");

    expect(encrypted.refreshTokenEncrypted).toBeDefined();
    expect(decryptSecret(encrypted.refreshTokenEncrypted!)).toBe("1//test-refresh-token");

    expect(encrypted.metadataEncrypted.serviceAccountEncrypted).toBeDefined();
    expect(decryptSecret(encrypted.metadataEncrypted.serviceAccountEncrypted!)).toContain('"project_id":"my-proj"');
  });

  it("throws clear error when neither OAuth nor Service Account credentials are provided", () => {
    expect(() =>
      createDynamicAuthClient({}, ["https://www.googleapis.com/auth/analytics.readonly"])
    ).toThrow(/Missing credentials/i);
  });
});
