import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { testGooglePlayConnection } from "@/lib/google/play-console";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      accountLabel,
      packageName,
      authMethod,
      serviceAccountJson,
      clientId,
      clientSecret,
      refreshToken
    } = body;

    let serviceAccount;
    if (authMethod === "service_account" && serviceAccountJson) {
      try {
        serviceAccount = typeof serviceAccountJson === "string" ? JSON.parse(serviceAccountJson) : serviceAccountJson;
      } catch {
        return NextResponse.json({
          success: false,
          message: "Invalid Service Account JSON format."
        }, { status: 400 });
      }
    }

    const oauth = clientId && clientSecret && refreshToken
      ? { clientId, clientSecret, refreshToken }
      : undefined;

    const result = await testGooglePlayConnection({
      packageName,
      appTitle: accountLabel || packageName,
      serviceAccount,
      oauth
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error?.message || "Failed to verify connection."
    }, { status: 500 });
  }
}
