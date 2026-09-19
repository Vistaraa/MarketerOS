import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { Platform } from "@prisma/client";

export interface UserOAuth2Credentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
}

export interface UserServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

export interface GoogleAdsCredentials extends UserOAuth2Credentials {
  developerToken: string;
  customerId: string;
  loginCustomerId?: string;
}

export interface GA4Credentials {
  propertyId: string;
  oauth?: UserOAuth2Credentials;
  serviceAccount?: UserServiceAccountCredentials;
  measurementSecret?: string;
  apiSecret?: string;
}

export interface GSCCredentials {
  siteUrl: string;
  oauth?: UserOAuth2Credentials;
  serviceAccount?: UserServiceAccountCredentials;
}

export interface AdMobCredentials {
  publisherId: string;
  oauth?: UserOAuth2Credentials;
  serviceAccount?: UserServiceAccountCredentials;
}

export type DynamicAuthClient = InstanceType<typeof google.auth.OAuth2> | InstanceType<typeof google.auth.JWT>;

/**
 * Creates an authenticated Google Auth instance (OAuth2 or Service Account JWT)
 * dynamically from the provided user credentials.
 * ZERO server-side environment keys are used.
 */
export function createDynamicAuthClient(
  auth: { oauth?: UserOAuth2Credentials; serviceAccount?: UserServiceAccountCredentials },
  scopes: string[]
): DynamicAuthClient {
  if (auth.serviceAccount) {
    const { client_email, private_key } = auth.serviceAccount;
    // Format private key properly if newlines were escaped
    const formattedKey = private_key.replace(/\\n/g, "\n");
    const jwtClient = new google.auth.JWT({
      email: client_email,
      key: formattedKey,
      scopes
    });
    return jwtClient;
  }

  if (auth.oauth) {
    const { clientId, clientSecret, refreshToken, accessToken } = auth.oauth;
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
      access_token: accessToken
    });
    return oauth2Client;
  }

  throw new Error("Missing credentials: User must provide either OAuth2 or Service Account credentials.");
}

/**
 * Encrypts sensitive credentials for safe storage in the database
 */
export function encryptCredentialFields(input: {
  developerToken?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessToken?: string;
  serviceAccountJson?: string;
  measurementSecret?: string;
  apiKey?: string;
}): {
  apiKeyEncrypted?: string;
  accessTokenEncrypted?: string;
  refreshTokenEncrypted?: string;
  metadataEncrypted: Record<string, string>;
} {
  const metadataEncrypted: Record<string, string> = {};

  if (input.developerToken) {
    metadataEncrypted.developerTokenEncrypted = encryptSecret(input.developerToken);
  }
  if (input.clientId) {
    metadataEncrypted.clientIdEncrypted = encryptSecret(input.clientId);
  }
  if (input.clientSecret) {
    metadataEncrypted.clientSecretEncrypted = encryptSecret(input.clientSecret);
  }
  if (input.serviceAccountJson) {
    metadataEncrypted.serviceAccountEncrypted = encryptSecret(input.serviceAccountJson);
  }
  if (input.measurementSecret) {
    metadataEncrypted.measurementSecretEncrypted = encryptSecret(input.measurementSecret);
  }

  return {
    apiKeyEncrypted: input.apiKey ? encryptSecret(input.apiKey) : undefined,
    accessTokenEncrypted: input.accessToken ? encryptSecret(input.accessToken) : undefined,
    refreshTokenEncrypted: input.refreshToken ? encryptSecret(input.refreshToken) : undefined,
    metadataEncrypted
  };
}

/**
 * Retrieves and decrypts the user-provided Google integration record for a workspace.
 */
export async function getDecryptedGoogleIntegration(
  workspaceId: string,
  platform: Platform
) {
  const integration = await prisma.integration.findFirst({
    where: {
      workspaceId,
      platform,
      status: "CONNECTED"
    }
  });

  if (!integration) {
    return null;
  }

  const meta = (integration.metadata as Record<string, unknown>) || {};

  let refreshToken = "";
  if (integration.refreshTokenEncrypted) {
    try {
      refreshToken = decryptSecret(integration.refreshTokenEncrypted);
    } catch {
      refreshToken = "";
    }
  }

  let clientId = "";
  if (meta.clientIdEncrypted && typeof meta.clientIdEncrypted === "string") {
    try {
      clientId = decryptSecret(meta.clientIdEncrypted);
    } catch {
      clientId = "";
    }
  }

  let clientSecret = "";
  if (meta.clientSecretEncrypted && typeof meta.clientSecretEncrypted === "string") {
    try {
      clientSecret = decryptSecret(meta.clientSecretEncrypted);
    } catch {
      clientSecret = "";
    }
  }

  let developerToken = "";
  if (meta.developerTokenEncrypted && typeof meta.developerTokenEncrypted === "string") {
    try {
      developerToken = decryptSecret(meta.developerTokenEncrypted);
    } catch {
      developerToken = "";
    }
  }

  let serviceAccount: UserServiceAccountCredentials | undefined;
  if (meta.serviceAccountEncrypted && typeof meta.serviceAccountEncrypted === "string") {
    try {
      const saRaw = decryptSecret(meta.serviceAccountEncrypted);
      serviceAccount = JSON.parse(saRaw);
    } catch {
      serviceAccount = undefined;
    }
  }

  let measurementSecret: string | undefined;
  if (meta.measurementSecretEncrypted && typeof meta.measurementSecretEncrypted === "string") {
    try {
      measurementSecret = decryptSecret(meta.measurementSecretEncrypted);
    } catch {
      measurementSecret = undefined;
    }
  }

  const oauth: UserOAuth2Credentials | undefined =
    clientId && clientSecret && refreshToken
      ? { clientId, clientSecret, refreshToken }
      : undefined;

  return {
    integrationId: integration.id,
    accountName: integration.accountName || "",
    accountId: integration.accountId || "",
    loginCustomerId: typeof meta.loginCustomerId === "string" ? meta.loginCustomerId : undefined,
    developerToken,
    oauth,
    serviceAccount,
    measurementSecret,
    metadata: meta,
    lastSyncedAt: integration.lastSyncedAt
  };
}
