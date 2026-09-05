import { prisma } from "../lib/prisma";

async function main() {
  const integrations = await prisma.integration.findMany();
  console.log("Found integrations count:", integrations.length);
  for (const item of integrations) {
    console.log({
      id: item.id,
      platform: item.platform,
      accountName: item.accountName,
      accountId: item.accountId,
      hasAccessToken: Boolean(item.accessTokenEncrypted),
      hasRefreshToken: Boolean(item.refreshTokenEncrypted),
      hasApiKey: Boolean(item.apiKey || item.apiKeyEncrypted),
      workspaceId: item.workspaceId
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
