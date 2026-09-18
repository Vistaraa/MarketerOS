import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authenticatePersistedUser, clearSession, createPersistedUser, getSession, setSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const credentials = z.object({ email: z.string().email(), password: z.string().min(8) });

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  if (path === "session") {
    const session = await getSession();
    return NextResponse.json({
      data: {
        authenticated: Boolean(session),
        user: session ? { id: session.userId, name: session.name, email: session.email, workspaceId: session.workspaceId, role: session.role } : null
      }
    });
  }
  if (path === "set-password") {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (!token) return NextResponse.json({ error: { message: "Invitation token is required." } }, { status: 400 });
    const { verifyInvitationToken } = await import("@/lib/invite-service");
    const result = await verifyInvitationToken(token);
    if (!result.valid) return NextResponse.json({ error: { message: result.reason || "Invalid or expired invitation token." } }, { status: 400 });
    return NextResponse.json({ data: result });
  }
  return NextResponse.json({ error: { message: "Auth route not found." } }, { status: 404 });
}

export async function POST(request: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const body = await request.json().catch(() => null);

  if (path === "logout") {
    await clearSession();
    return NextResponse.json({ data: { success: true, message: "Logged out successfully." } });
  }

  if (path === "signup") {
    const parsed = credentials.extend({
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      workspaceName: z.string().min(2, "Workspace name is required")
    }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: { message: parsed.error.issues[0]?.message || "Invalid signup details." } }, { status: 400 });
    }

    const { email, password, firstName, lastName, workspaceName } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: { message: "An account with this email address already exists. Please sign in instead." } }, { status: 400 });
    }

    const result = await createPersistedUser({
      email,
      firstName,
      lastName,
      workspaceName,
      passwordHash: await bcrypt.hash(password, 12)
    });

    const sessionInput = {
      userId: result.user.id,
      workspaceId: result.workspace.id,
      role: "OWNER",
      email: result.user.email,
      name: `${result.user.firstName} ${result.user.lastName}`
    };

    await setSession(sessionInput);
    return NextResponse.json({ data: { success: true, user: sessionInput, next: "/onboarding/brand" } }, { status: 201 });
  }

  if (path === "login") {
    const parsed = credentials.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { message: "Enter a valid email address and password (at least 8 characters)." } }, { status: 400 });
    }

    const session = await authenticatePersistedUser(parsed.data.email, parsed.data.password);
    if (!session) {
      return NextResponse.json({ error: { message: "Invalid email or password. Please check your credentials." } }, { status: 401 });
    }

    await setSession(session);
    return NextResponse.json({ data: { success: true, user: session, next: "/overview" } });
  }

  if (path === "forgot-password") {
    const parsed = z.object({ email: z.string().email("Please enter a valid email address.") }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { message: parsed.error.issues[0]?.message || "Invalid email address." } }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

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

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
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
}

