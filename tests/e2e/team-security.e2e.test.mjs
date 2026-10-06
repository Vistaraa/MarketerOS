/**
 * End-to-end security tests for team management and sessions (regression tests for audit findings T1–T5).
 * They run against a live server and use the same database for fixtures and assertions.
 *
 *   BASE_URL=http://localhost:3000 npm run test:e2e
 *
 * Requires DATABASE_URL and SESSION_SECRET (read from the environment, or from .env when present).
 * Everything created here is deleted afterwards.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac, randomBytes } from "node:crypto";
import fs from "node:fs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

// Load .env for local runs (CI provides real environment variables).
if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)="?(.*?)"?\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const BASE = process.env.BASE_URL || "http://localhost:3000";
const RUN = `${Date.now()}${randomBytes(2).toString("hex")}`;
const PASSWORD = "Passw0rd!e2e";
const prisma = new PrismaClient();
const created = { emails: [] };

// Each request appears to come from a different client so per-IP auth rate limits don't interfere.
const randomIp = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
const cookieFrom = (res) => /marketeros_session=([^;]+)/.exec(res.headers.get("set-cookie") || "")?.[0] || null;

async function call(method, path, { cookie, body } = {}) {
  const headers = { "x-forwarded-for": randomIp(), ...(cookie ? { cookie } : {}), ...(body !== undefined ? { "content-type": "application/json" } : {}) };
  const res = await fetch(BASE + path, { method, headers, redirect: "manual", body: body !== undefined ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => null);
  return { status: res.status, json, res };
}

const emailFor = (tag) => { const email = `e2e-sec-${RUN}-${tag}@example.test`; created.emails.push(email); return email; };

async function signup(tag) {
  const email = emailFor(tag);
  const { status, json, res } = await call("POST", "/api/auth/signup", { body: { email, password: PASSWORD, firstName: "Sec", lastName: tag, workspaceName: `Security ${tag}` } });
  assert.equal(status, 201, `signup ${tag}: ${JSON.stringify(json)}`);
  return { email, cookie: cookieFrom(res), id: json.data.user.userId, ws: json.data.user.workspaceId };
}

async function login(email) {
  const { status, json, res } = await call("POST", "/api/auth/login", { body: { email, password: PASSWORD } });
  return { status, json, cookie: cookieFrom(res), user: json?.data?.user };
}

/** A user with a password who belongs only to `workspaceId`, as if they had accepted an invitation. */
async function acceptedMember(tag, workspaceId, role) {
  const user = await prisma.user.create({ data: { email: emailFor(tag), firstName: "Sec", lastName: tag, passwordHash: await bcrypt.hash(PASSWORD, 4), status: "ACTIVE" } });
  await addMembership(user.id, workspaceId, role);
  return { id: user.id, email: user.email };
}

const addMembership = (userId, workspaceId, role) =>
  prisma.oAuthState.create({ data: { userId, workspaceId, providerKey: "WORKSPACE_MEMBER", returnTo: role, expiresAt: new Date(Date.now() + 86_400_000) } });

/** Same token format as lib/invite-service.ts. */
function inviteToken({ userId, workspaceId, email, role }) {
  const secret = process.env.SESSION_SECRET || process.env.ENCRYPTION_KEY;
  const payload = Buffer.from(JSON.stringify({ userId, workspaceId, email, role, exp: Date.now() + 3_600_000 })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}.${randomBytes(8).toString("hex")}`;
}

let A, B, M, D, W, invitee;

before(async () => {
  A = await signup("owner-a");      // workspace owner
  B = await signup("owner-b");      // owner of an unrelated workspace (the "attacker")
  W = await signup("owner-w");      // unrelated user who will be invited by B
  M = await signup("manager-m");    // owns their own workspace, and is a MANAGER in A
  await addMembership(M.id, A.ws, "MANAGER");
  D = await acceptedMember("admin-d", A.ws, "ADMIN");

  const invite = await call("POST", "/api/v1/team", { cookie: A.cookie, body: { firstName: "Pending", lastName: "Invitee", email: emailFor("invitee"), role: "VIEWER" } });
  assert.equal(invite.status, 201, JSON.stringify(invite.json));
  invitee = invite.json.data.item;
});

after(async () => {
  const users = await prisma.user.findMany({ where: { email: { in: created.emails } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await prisma.oAuthState.deleteMany({ where: { userId: { in: ids } } });
  await prisma.workspace.deleteMany({ where: { ownerId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

test("T1: a Manager cannot change roles, including their own", async () => {
  const m = await login(M.email);
  assert.equal(m.user.workspaceId, A.ws);
  assert.equal(m.user.role, "MANAGER");
  assert.equal((await call("PATCH", `/api/v1/team/${M.id}`, { cookie: m.cookie, body: { role: "OWNER" } })).status, 403);
  assert.equal((await call("PATCH", `/api/v1/team/${M.id}`, { cookie: m.cookie, body: { role: "ADMIN" } })).status, 403);
  assert.equal((await call("PATCH", `/api/v1/team/${invitee.id}`, { cookie: m.cookie, body: { role: "ANALYST" } })).status, 403);
  assert.equal((await call("DELETE", `/api/v1/team/${invitee.id}`, { cookie: m.cookie })).status, 403);
  assert.equal((await call("POST", "/api/v1/team", { cookie: m.cookie, body: { firstName: "x", lastName: "y", email: emailFor("by-manager"), role: "ADMIN" } })).status, 403);
  assert.equal((await login(M.email)).user.role, "MANAGER");
});

test("T1: OWNER can never be assigned, and only the owner manages Admins", async () => {
  assert.equal((await call("PATCH", `/api/v1/team/${M.id}`, { cookie: A.cookie, body: { role: "OWNER" } })).status, 400);
  const d = await login(D.email);
  assert.equal(d.user.role, "ADMIN");
  assert.equal((await call("PATCH", `/api/v1/team/${M.id}`, { cookie: d.cookie, body: { role: "ADMIN" } })).status, 403, "admin cannot grant ADMIN");
  assert.equal((await call("PATCH", `/api/v1/team/${A.id}`, { cookie: d.cookie, body: { status: "SUSPENDED" } })).status, 403, "nobody can change the owner");
  assert.equal((await call("PATCH", `/api/v1/team/${D.id}`, { cookie: d.cookie, body: { role: "MANAGER" } })).status, 403, "no self-changes");
  assert.equal((await call("POST", "/api/v1/team", { cookie: d.cookie, body: { firstName: "x", lastName: "y", email: emailFor("admin-invite"), role: "ADMIN" } })).status, 403);

  // Legitimate change still works.
  assert.equal((await call("PATCH", `/api/v1/team/${M.id}`, { cookie: d.cookie, body: { role: "ANALYST" } })).status, 200);
  assert.equal((await login(M.email)).user.role, "ANALYST");
  await call("PATCH", `/api/v1/team/${M.id}`, { cookie: A.cookie, body: { role: "MANAGER" } });
});

test("T2/T3: another workspace cannot suspend, change, remove or re-invite your people", async () => {
  assert.equal((await call("PATCH", `/api/v1/team/${A.id}`, { cookie: B.cookie, body: { status: "SUSPENDED" } })).status, 404);
  assert.equal((await call("PATCH", `/api/v1/team/${M.id}`, { cookie: B.cookie, body: { role: "VIEWER" } })).status, 404);
  assert.equal((await call("DELETE", `/api/v1/team/${invitee.id}`, { cookie: B.cookie })).status, 404);
  assert.equal((await call("POST", `/api/v1/team/${invitee.id}/resend`, { cookie: B.cookie })).status, 404);
  assert.equal((await prisma.user.findUnique({ where: { id: A.id } })).status, "ACTIVE");
  assert.ok(await prisma.user.findUnique({ where: { id: invitee.id } }), "invitee must still exist");
});

test("T2: suspension only applies to people who belong solely to your workspace", async () => {
  // M owns another workspace: suspending their whole account from A is refused.
  assert.equal((await call("PATCH", `/api/v1/team/${M.id}`, { cookie: A.cookie, body: { status: "SUSPENDED" } })).status, 409);
  assert.equal((await prisma.user.findUnique({ where: { id: M.id } })).status, "ACTIVE");

  const E = await acceptedMember("exclusive-e", A.ws, "MANAGER");
  assert.equal((await call("PATCH", `/api/v1/team/${E.id}`, { cookie: A.cookie, body: { status: "SUSPENDED" } })).status, 200);
  const e = await login(E.email);
  assert.equal(e.status, 403, "suspended login is a 403, not a 500");
  assert.equal(e.json.error.code, "ACCOUNT_SUSPENDED");
});

test("T4: an unaccepted invitation never moves someone's login into the inviter's workspace", async () => {
  const invite = await call("POST", "/api/v1/team", { cookie: B.cookie, body: { firstName: "Victim", lastName: "W", email: W.email, role: "MANAGER" } });
  assert.equal(invite.status, 201);
  const item = invite.json.data.item;
  assert.deepEqual(Object.keys(item).sort(), ["email", "firstName", "id", "lastName", "role", "status"], "no account internals (e.g. passwordHash) in the response");
  const w = await login(W.email);
  assert.equal(w.user.workspaceId, W.ws);
  assert.equal(w.user.role, "OWNER");
  assert.equal((await prisma.user.findUnique({ where: { id: W.id } })).lastName, "owner-w", "invitation must not rename an existing account");
});

test("T5: a forged, unsigned session cookie reveals nothing", async () => {
  const E = await acceptedMember("suspended-t5", A.ws, "VIEWER");
  await prisma.user.update({ where: { id: E.id }, data: { status: "SUSPENDED" } });
  const forged = `${Buffer.from(JSON.stringify({ userId: E.id })).toString("base64url")}.forged-signature`;
  const session = await call("GET", "/api/auth/session", { cookie: `marketeros_session=${forged}` });
  assert.equal(session.json.data.authenticated, false);
  assert.equal(session.json.data.user, null);
});

test("Team list only shows your own workspace's people", async () => {
  const list = await call("GET", "/api/v1/team", { cookie: B.cookie });
  assert.equal(list.status, 200);
  const emails = list.json.data.items.map((u) => u.email);
  assert.ok(!emails.includes(invitee.email), "other workspaces' invitees must not be listed");
  assert.ok(!emails.includes(A.email));
});

test("Invitation links: single use, and revoked links stop working", async () => {
  const user = await prisma.user.create({ data: { email: emailFor("token-x"), firstName: "Tok", lastName: "X", status: "INVITED" } });
  const token = inviteToken({ userId: user.id, workspaceId: A.ws, email: user.email, role: "VIEWER" });
  await prisma.oAuthState.create({ data: { userId: user.id, workspaceId: A.ws, providerKey: "TEAM_INVITE", returnTo: "VIEWER", stateHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3_600_000) } });
  assert.equal((await call("POST", "/api/auth/set-password", { body: { token, password: PASSWORD } })).status, 200);
  assert.equal((await call("POST", "/api/auth/set-password", { body: { token, password: "Another123!" } })).status, 400, "second use rejected");
  assert.equal((await login(user.email)).user.workspaceId, A.ws);

  // A token whose invitation row was removed (revoked) must not be accepted.
  const revoked = inviteToken({ userId: user.id, workspaceId: A.ws, email: user.email, role: "VIEWER" });
  assert.equal((await call("GET", `/api/auth/set-password?token=${encodeURIComponent(revoked)}`)).status, 400);
  assert.equal((await call("POST", "/api/auth/set-password", { body: { token: revoked, password: PASSWORD } })).status, 400);
});

test("Stored roles are not trusted blindly: a planted OWNER role grants nothing", async () => {
  const P = await acceptedMember("planted-p", A.ws, "OWNER");
  const p = await login(P.email);
  assert.equal(p.user.workspaceId, A.ws);
  assert.equal(p.user.role, "VIEWER");
  assert.equal((await call("GET", "/api/v1/billing", { cookie: p.cookie })).status, 403);
});
