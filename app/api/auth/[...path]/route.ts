import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authenticatePersistedUser, clearSession, createPersistedUser, getSession, setSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clearRateLimit, clientIp, formatRetryAfter, hitRateLimit } from "@/lib/rate-limit";

import { cookies } from "next/headers";

export const runtime = "nodejs";

const credentials = z.object({ email: z.string().email(), password: z.string().min(8) });

const MAX_FAILED_LOGINS = 5;
const FAILED_LOGIN_WINDOW_SECONDS = 15 * 60;

function tooManyRequests(retryAfterSeconds: number, message?: string) {
  return NextResponse.json(
    { error: { code: "RATE_LIMITED", message: message || `Too many attempts. Please try again in ${formatRetryAfter(retryAfterSeconds)}.` } },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

/** Returns a 429 response when this client IP has exceeded `limit` hits of `action` per window, else null. */
async function limitByIp(request: Request, action: string, limit: number, windowSeconds: number) {
  const result = await hitRateLimit(`${action}:ip:${clientIp(request)}`, limit, windowSeconds);
  return result.allowed ? null : tooManyRequests(result.retryAfterSeconds);
}

/** Base URL for emailed links. In production only APP_URL is trusted; the request origin comes from the spoofable Host header. */
function appBaseUrl(request: Request) {
  return process.env.APP_URL || (process.env.NODE_ENV !== "production" ? new URL(request.url).origin : null);
}

async function resolvePath(
  request: Request,
  params: { path: string[] } | Promise<{ path: string[] }>
): Promise<string> {
  let segments: string[] = [];
  try {
    const resolvedParams = await Promise.resolve(params);
    if (resolvedParams?.path) {
      segments = Array.isArray(resolvedParams.path)
        ? resolvedParams.path
        : [String(resolvedParams.path)];
    }
  } catch {
    // fallback
  }

  let pathStr = segments.filter(Boolean).join("/").toLowerCase().trim();

  if (!pathStr) {
    try {
      const url = new URL(request.url);
      pathStr = url.pathname.replace(/^\/api\/auth\/?/, "").toLowerCase().trim();
    } catch {
      // ignore
    }
  }

  return pathStr.replace(/^\/+|\/+$/g, "");
}

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } | Promise<{ path: string[] }> }
) {
  try {
    const path = await resolvePath(request, params);
    if (path === "session") {
      const session = await getSession();
      if (session) {
        const account = await prisma.user.findUnique({ where: { id: session.userId }, select: { emailVerifiedAt: true } });
        return NextResponse.json({
          data: {
            authenticated: true,
            suspended: false,
            user: { id: session.userId, name: session.name, email: session.email, workspaceId: session.workspaceId, role: session.role, emailVerified: Boolean(account?.emailVerifiedAt) }
          }
        });
      }

      let isSuspended = false;
      let suspendedUser: { email?: string; name?: string } | null = null;
      try {
        const store = await cookies();
        const raw = store.get("marketeros_session")?.value;
        if (raw) {
          const [payload] = raw.split(".");
          if (payload) {
            const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
            if (parsed?.userId) {
              const u = await prisma.user.findUnique({ where: { id: parsed.userId }, select: { status: true, email: true, firstName: true, lastName: true } });
              if (u && u.status === "SUSPENDED") {
                isSuspended = true;
                suspendedUser = { email: u.email, name: `${u.firstName} ${u.lastName}`.trim() };
              }
            }
          }
        }
      } catch {
        // ignore
      }

      return NextResponse.json({
        data: {
          authenticated: false,
          suspended: isSuspended,
          user: suspendedUser
        }
      });
    }
    if (path === "set-password" || path === "accept-invite" || path === "activate") {
      const url = new URL(request.url);
      const token = url.searchParams.get("token");
      if (!token) return NextResponse.json({ error: { message: "Invitation token is required." } }, { status: 400 });
      const { verifyInvitationToken } = await import("@/lib/invite-service");
      const result = await verifyInvitationToken(token);
      if (!result.valid) return NextResponse.json({ error: { message: result.reason || "Invalid or expired invitation token." } }, { status: 400 });
      return NextResponse.json({ data: result });
    }
    return NextResponse.json({ error: { message: "Auth route not found." } }, { status: 404 });
  } catch (err: any) {
    console.error("Auth GET error:", err);
    return NextResponse.json(
      { error: { message: err?.message || "Authentication service failed." } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { path: string[] } | Promise<{ path: string[] }> }
) {
  try {
    const path = await resolvePath(request, params);
    const body = await request.json().catch(() => null);

    if (path === "logout") {
      await clearSession();
      return NextResponse.json({ data: { success: true, message: "Logged out successfully." } });
    }
    if (path === "set-password" || path === "accept-invite" || path === "activate") {
      const limited = await limitByIp(request, "accept-invite", 10, 15 * 60);
      if (limited) return limited;
      const parsed = z.object({
        token: z.string().min(1, "Invitation token is required."),
        password: z.string().min(8, "Password must be at least 8 characters.")
      }).safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: { message: parsed.error.issues[0]?.message || "Invalid payload." } }, { status: 400 });
      }
      const { consumeInvitationToken } = await import("@/lib/invite-service");
      const result = await consumeInvitationToken(parsed.data.token, parsed.data.password);
      const { getDefaultRouteForRole, setSession } = await import("@/lib/auth-server");

      const sessionInput = {
        userId: result.user.id,
        workspaceId: result.workspaceId,
        role: result.role,
        email: result.user.email,
        name: `${result.user.firstName} ${result.user.lastName}`.trim()
      };
      await setSession(sessionInput);
      const nextRoute = getDefaultRouteForRole(result.role);

      return NextResponse.json({
        data: {
          success: true,
          message: "Password set successfully! Your account is active.",
          email: result.user.email,
          user: sessionInput,
          next: nextRoute
        }
      });
    }
    if (path === "signup") {
      const limited = await limitByIp(request, "signup", 5, 60 * 60);
      if (limited) return limited;
      const parsed = credentials.extend({ firstName: z.string().min(1), lastName: z.string().min(1), workspaceName: z.string().min(2) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: { message: parsed.error.issues[0]?.message || "Invalid signup." } }, { status: 400 });
      const { password, firstName, lastName, workspaceName } = parsed.data;
      const email = parsed.data.email.trim().toLowerCase();
      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } }
      });
      if (existingUser) {
        return NextResponse.json({ error: { message: "An account with this email address already exists. Please sign in instead." } }, { status: 400 });
      }
      const result = await createPersistedUser({ email, firstName, lastName, workspaceName, passwordHash: await bcrypt.hash(password, 12) });
      const sessionInput = { userId: result.user.id, workspaceId: result.workspace.id, role: "OWNER", email: result.user.email, name: `${result.user.firstName} ${result.user.lastName}` };
      await setSession(sessionInput);
      const baseUrl = appBaseUrl(request);
      if (baseUrl) {
        try {
          const { sendEmailVerification } = await import("@/lib/email-verification");
          await sendEmailVerification(result.user.id, baseUrl);
        } catch (err) {
          console.error("Sending verification email failed:", err);
        }
      }
      return NextResponse.json({ data: { success: true, user: sessionInput, next: "/onboarding/brand" } }, { status: 201 });
    }
    if (path === "login") {
      const limited = await limitByIp(request, "login", 30, 15 * 60);
      if (limited) return limited;
      const parsed = credentials.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: { message: "Enter a valid email and password." } }, { status: 400 });
      const email = parsed.data.email.trim().toLowerCase();
      // Per-account lockout: IP limits alone don't stop a distributed password-guessing attack on one account.
      const failureKey = `login:fail:${email}`;
      const lockout = await checkRateLimit(failureKey, MAX_FAILED_LOGINS, FAILED_LOGIN_WINDOW_SECONDS);
      if (!lockout.allowed) {
        return tooManyRequests(lockout.retryAfterSeconds, `Too many failed sign-in attempts for this account. Try again in ${formatRetryAfter(lockout.retryAfterSeconds)}, or reset your password.`);
      }
      const session = await authenticatePersistedUser(email, parsed.data.password);
      if (!session) {
        await hitRateLimit(failureKey, MAX_FAILED_LOGINS, FAILED_LOGIN_WINDOW_SECONDS);
        return NextResponse.json({ error: { message: "Email or password is incorrect." } }, { status: 401 });
      }
      await clearRateLimit(failureKey);
      await setSession(session);
      const { getDefaultRouteForRole } = await import("@/lib/auth-server");
      const nextRoute = getDefaultRouteForRole(session.role);
      return NextResponse.json({ data: { success: true, user: session, next: nextRoute } });
    }
    if (path === "forgot-password") {
      const parsed = z.object({ email: z.string().email("Please enter a valid email address.") }).safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: { message: parsed.error.issues[0]?.message || "Invalid email address." } }, { status: 400 });
      }
      const email = parsed.data.email.trim().toLowerCase();
      const limited = await limitByIp(request, "forgot-password", 10, 60 * 60);
      if (limited) return limited;
      // Counted for every address, existing or not, so a 429 here reveals nothing about which accounts exist.
      const perEmail = await hitRateLimit(`forgot-password:email:${email}`, 3, 60 * 60);
      if (!perEmail.allowed) return tooManyRequests(perEmail.retryAfterSeconds);
      const baseUrl = appBaseUrl(request);
      if (!baseUrl) {
        console.error("Password reset requested but APP_URL is not configured.");
      } else {
        try {
          const { requestPasswordReset } = await import("@/lib/password-reset");
          await requestPasswordReset(email, baseUrl);
        } catch (err) {
          console.error("Password reset request failed:", err);
        }
      }
      // Same response whether or not the account exists, so this endpoint can't be used to discover accounts.
      return NextResponse.json({
        data: {
          success: true,
          message: "If an account exists for that email, we've sent a link to reset your password."
        }
      });
    }
    if (path === "reset-password") {
      const limited = await limitByIp(request, "reset-password", 10, 15 * 60);
      if (limited) return limited;
      const parsed = z.object({
        token: z.string().min(1, "This reset link is invalid. Please request a new one."),
        password: z.string().min(8, "Password must be at least 8 characters long.")
      }).safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: { message: parsed.error.issues[0]?.message || "Invalid password." } }, { status: 400 });
      }
      const { resetPasswordWithToken } = await import("@/lib/password-reset");
      if (!(await resetPasswordWithToken(parsed.data.token, parsed.data.password))) {
        return NextResponse.json({ error: { message: "This reset link is invalid or has expired. Please request a new one." } }, { status: 400 });
      }
      return NextResponse.json({
        data: {
          success: true,
          message: "Your password has been reset successfully. You can now sign in with your new password."
        }
      });
    }
    if (path === "verify-email") {
      const limited = await limitByIp(request, "verify-email", 20, 15 * 60);
      if (limited) return limited;
      const parsed = z.object({ token: z.string().min(1) }).safeParse(body);
      const { verifyEmailWithToken } = await import("@/lib/email-verification");
      if (!parsed.success || !(await verifyEmailWithToken(parsed.data.token))) {
        return NextResponse.json({ error: { message: "This verification link is invalid or has expired. Sign in and request a new one." } }, { status: 400 });
      }
      return NextResponse.json({ data: { success: true, message: "Your email address has been verified." } });
    }
    if (path === "resend-verification") {
      const session = await getSession();
      if (!session) return NextResponse.json({ error: { message: "Please sign in to resend the verification email." } }, { status: 401 });
      const perUser = await hitRateLimit(`resend-verification:user:${session.userId}`, 3, 60 * 60);
      if (!perUser.allowed) return tooManyRequests(perUser.retryAfterSeconds);
      const baseUrl = appBaseUrl(request);
      if (!baseUrl) return NextResponse.json({ error: { message: "Email delivery is not configured." } }, { status: 503 });
      const { sendEmailVerification } = await import("@/lib/email-verification");
      await sendEmailVerification(session.userId, baseUrl);
      return NextResponse.json({ data: { success: true, message: `We've sent a new verification link to ${session.email}.` } });
    }
    return NextResponse.json({ error: { message: "Auth route not found." } }, { status: 404 });
  } catch (err: any) {
    console.error("Auth POST error:", err);
    return NextResponse.json(
      { error: { message: err?.message || "Authentication service failed. Please verify your database connection and environment variables." } },
      { status: 500 }
    );
  }
}

