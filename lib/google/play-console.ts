import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { createDynamicAuthClient, getDecryptedGoogleIntegration } from "@/lib/google/client";
import { Platform } from "@prisma/client";

export interface GooglePlayCredentials {
  packageName: string;
  appTitle?: string;
  serviceAccount?: {
    client_email: string;
    private_key: string;
    project_id?: string;
  };
  oauth?: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    accessToken?: string;
  };
}

/**
 * Validates Google Play Console credentials against the live Google Play Developer API (androidpublisher v3)
 */
export async function testGooglePlayConnection(credentials: GooglePlayCredentials): Promise<{
  success: boolean;
  message: string;
  details?: { packageName: string; appTitle?: string };
}> {
  try {
    if (!credentials.serviceAccount && !credentials.oauth) {
      return {
        success: false,
        message: "Please provide either a Service Account JSON or OAuth2 Refresh Token."
      };
    }
    if (!credentials.packageName) {
      return {
        success: false,
        message: "Package Name (e.g., com.example.app) is required."
      };
    }

    const authClient = createDynamicAuthClient(
      {
        serviceAccount: credentials.serviceAccount,
        oauth: credentials.oauth
      },
      [
        "https://www.googleapis.com/auth/androidpublisher",
        "https://www.googleapis.com/auth/playdeveloperreporting"
      ]
    );

    const androidPublisher = google.androidpublisher({ version: "v3", auth: authClient });

    // Live check: any API error (not found, permission denied, API disabled) means the connection does not work.
    await androidPublisher.reviews.list({
      packageName: credentials.packageName,
      maxResults: 1
    }).catch((err) => {
      const status = err?.status || err?.code;
      if (status === 404 || err?.message?.includes("Package not found")) {
        throw new Error(`Package "${credentials.packageName}" was not found or the API service account lacks permissions for this app.`);
      }
      throw new Error(`Google Play API rejected the request${status ? ` (${status})` : ""}: ${err?.message || "unknown error"}`);
    });

    return {
      success: true,
      message: `Live Connection Verified! Successfully authenticated with Google Play API for ${credentials.packageName}.`,
      details: {
        packageName: credentials.packageName,
        appTitle: credentials.appTitle || credentials.packageName
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to verify Google Play API connection."
    };
  }
}

/**
 * Returns decrypted Google Play Console credentials for workspace
 */
export async function getDecryptedGooglePlayIntegration(workspaceId: string) {
  const decrypted = await getDecryptedGoogleIntegration(workspaceId, Platform.GOOGLE_PLAY);
  if (!decrypted) return null;

  const packageName = (decrypted.metadata?.packageName as string) || "";
  const appTitle = (decrypted.metadata?.appTitle as string) || packageName || "Android Application";

  return {
    ...decrypted,
    packageName,
    appTitle
  };
}

/**
 * Returns the workspace's Play Console app, or null. Apps are only ever created by the Google Play
 * connect flow with the user's real package name; nothing here invents an app or its metrics.
 */
export async function getPlayConsoleApp(workspaceId: string, clientId?: string) {
  return prisma.playConsoleApp.findFirst({
    where: { workspaceId, ...(clientId ? { clientId } : {}) },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }]
  });
}
