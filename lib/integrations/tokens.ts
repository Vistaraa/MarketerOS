import type { Integration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getProvider } from "@/lib/integrations/provider";

/**
 * A working access token for an integration. Short-lived tokens (Google: 1 hour) are refreshed from the stored
 * refresh token when missing or about to expire, and the new token is saved for the next caller.
 */
export async function usableAccessToken(integration: Pick<Integration, "id" | "platform" | "providerKey" | "accessTokenEncrypted" | "apiKeyEncrypted" | "refreshTokenEncrypted" | "tokenExpiresAt">) {
  const provider = getProvider(integration.providerKey || integration.platform);
  let encrypted = integration.accessTokenEncrypted || integration.apiKeyEncrypted;
  const expiresSoon = !integration.tokenExpiresAt || integration.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000;
  if (provider.refreshAccessToken && integration.refreshTokenEncrypted && (!encrypted || expiresSoon)) {
    const fresh = await provider.refreshAccessToken(decryptSecret(integration.refreshTokenEncrypted));
    encrypted = encryptSecret(fresh.accessToken);
    await prisma.integration.update({ where: { id: integration.id }, data: { accessTokenEncrypted: encrypted, tokenExpiresAt: fresh.expiresAt || null } });
  }
  if (!encrypted) throw new Error("This integration is not connected. Configure credentials before syncing.");
  return decryptSecret(encrypted);
}
