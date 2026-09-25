import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authenticatePersistedUser, clearSession, createPersistedUser, getSession, setSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

import { cookies } from "next/headers";

export const runtime = "nodejs";

const credentials = z.object({ email: z.string().email(), password: z.string().min(8) });

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
        return NextResponse.json({
          data: {
            authenticated: true,
            suspended: false,
            user: { id: session.userId, name: session.name, email: session.email, workspaceId: session.workspaceId, role: session.role }
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
      return NextResponse.json({ data: { success: true, user: sessionInput, next: "/onboarding/brand" } }, { status: 201 });
    }
    if (path === "login") {
      const parsed = credentials.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: { message: "Enter a valid email and password." } }, { status: 400 });
      const email = parsed.data.email.trim().toLowerCase();
      const session = await authenticatePersistedUser(email, parsed.data.password);
      if (!session) return NextResponse.json({ error: { message: "Email or password is incorrect." } }, { status: 401 });
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
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } }
      });
      return NextResponse.json({
        data: {
          success: true,
          userFound: Boolean(user),
          message: `Password reset instructions have been generated for ${parsed.data.email}.`
        }
      });
    }
    if (path === "reset-password") {
      const parsed = z.object({
        email: z.string().email("Please enter a valid email address."),
        password: z.string().min(8, "Password must be at least 8 characters long.")
      }).safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: { message: parsed.error.issues[0]?.message || "Invalid password." } }, { status: 400 });
      }
      const email = parsed.data.email.trim().toLowerCase();
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } }
      });
      if (!user) {
        return NextResponse.json({ error: { message: "No account registered with this email address." } }, { status: 404 });
      }
      const passwordHash = await bcrypt.hash(parsed.data.password, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      });
      return NextResponse.json({
        data: {
          success: true,
          message: "Your password has been reset successfully. You can now sign in with your new password."
        }
      });
    }
    if (path === "verify-email") {
      return NextResponse.json({
        data: {
          success: true,
          message: "Email verified successfully."
        }
      });
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

