import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authenticatePersistedUser, clearSession, createPersistedUser, getSession, setSession } from "@/lib/auth-server";

export const runtime = "nodejs";

const credentials = z.object({ email: z.string().email(), password: z.string().min(8) });

export async function GET(_request: Request, { params }: { params: { path: string[] } }) {
  if (params.path.join("/") === "session") {
    const session = await getSession();
    return NextResponse.json({ data: { authenticated: Boolean(session), user: session ? { id: session.userId, name: session.name, email: session.email, workspaceId: session.workspaceId, role: session.role } : null } });
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
    const parsed = credentials.extend({ firstName: z.string().min(1), lastName: z.string().min(1), workspaceName: z.string().min(2) }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: { message: parsed.error.issues[0]?.message || "Invalid signup." } }, { status: 400 });
    const { email, password, firstName, lastName, workspaceName } = parsed.data;
    const result = await createPersistedUser({ email, firstName, lastName, workspaceName, passwordHash: await bcrypt.hash(password, 12) });
    const sessionInput = { userId: result.user.id, workspaceId: result.workspace.id, role: "OWNER", email: result.user.email, name: `${result.user.firstName} ${result.user.lastName}` };
    await setSession(sessionInput);
    return NextResponse.json({ data: { success: true, user: sessionInput, next: "/onboarding/brand" } }, { status: 201 });
  }
  if (path === "login") {
    const parsed = credentials.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: { message: "Enter a valid email and password." } }, { status: 400 });
    const session = await authenticatePersistedUser(parsed.data.email, parsed.data.password);
    if (!session) return NextResponse.json({ error: { message: "Email or password is incorrect." } }, { status: 401 });
    await setSession(session);
    return NextResponse.json({ data: { success: true, user: session, next: "/overview" } });
  }
  if (["forgot-password", "reset-password", "verify-email"].includes(path)) return NextResponse.json({ error: { code: "NOT_CONFIGURED", message: "Email delivery for this action is not configured yet." } }, { status: 501 });
  return NextResponse.json({ error: { message: "Auth route not found." } }, { status: 404 });
}
