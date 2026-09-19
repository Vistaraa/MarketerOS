import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashSecret } from "@/lib/crypto";
import type { ProviderKey } from "@/lib/integrations/provider";

export async function createOAuthState(input: { workspaceId: string; userId: string; providerKey: ProviderKey; returnTo?: string }) {
  const state = randomBytes(32).toString("base64url");
  await prisma.oAuthState.create({ data: { stateHash: hashSecret(state), workspaceId: input.workspaceId, userId: input.userId, providerKey: input.providerKey, returnTo: input.returnTo?.startsWith("/") ? input.returnTo : "/integrations", expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
  return state;
}

export async function consumeOAuthState(state: string) {
  const stateHash = hashSecret(state);
  const consumed = await prisma.oAuthState.updateMany({ where: { stateHash, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
  if (!consumed.count) return null;
  return prisma.oAuthState.findUnique({ where: { stateHash } });
}
