/**
 * Shared pieces of the /api/v1 API: input schemas, response helpers, permission and subscription checks.
 * The route (app/api/v1/[...path]/route.ts) runs the common checks and dispatches to lib/api/v1/handlers/*.
 */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { can, requireTenant } from "@/lib/auth-server";
import { parseListQuery } from "@/lib/api-contracts";

export type V1Session = Awaited<ReturnType<typeof requireTenant>>;
export type V1Auth = { session: V1Session };
export type ListQuery = ReturnType<typeof parseListQuery>;
export type V1Context = {
  request: Request;
  url: URL;
  path: string;
  auth: V1Auth;
  // Parsed JSON body (writes only).
  body: any;
  listQuery: ListQuery;
  query: string;
  parts: string[];
  entity: string;
  id: string;
};
export type V1Handler = (ctx: V1Context) => Promise<Response | null>;
export type V1Module = Partial<Record<"GET" | "POST" | "PATCH" | "DELETE", V1Handler>>;

export const campaignInput = z.object({
  name: z.string().min(2),
  objective: z.string().min(2),
  platform: z.string().optional(),
  platforms: z.array(z.string()).optional(),
  budget: z.coerce.number().positive(),
  dailyBudget: z.coerce.number().positive().optional(),
  targetRoas: z.coerce.number().positive().optional(),
  targetCpa: z.coerce.number().positive().optional(),
  biddingStrategy: z.string().optional(),
  integrationId: z.string().optional()
});

export const integrationCredentialInput = z.object({
  platform: z.string().min(2),
  accountName: z.string().min(1),
  accountId: z.string().min(1),
  apiKey: z.string().min(1, "API Key / Access Token is required to authenticate with this platform."),
  metadata: z.record(z.unknown()).optional()
});

export const leadInput = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  score: z.coerce.number().optional(),
  estimatedValue: z.coerce.number().optional(),
  ownerId: z.string().optional(),
  notes: z.string().optional()
});

export const aiInput = z.object({ prompt: z.string().min(3).max(20000), kind: z.string().min(2).max(80).default("content") });

export const contentInput = z.object({ title: z.string().min(1), type: z.string().default("SOCIAL_POST"), body: z.string().optional(), platform: z.string().optional(), clientId: z.string().optional(), status: z.string().optional(), scheduledAt: z.string().optional().nullable(), publishedAt: z.string().optional().nullable(), keywords: z.array(z.string()).optional(), metadata: z.record(z.unknown()).optional() });

export const socialAccountConnectInput = z.object({ platform: z.string().min(1), accountId: z.string().min(1), apiKey: z.string().min(1, "Access token or API key is required."), accountName: z.string().optional(), username: z.string().optional() });

export const socialPostInput = z.object({ socialAccountId: z.string().min(1), title: z.string().optional(), caption: z.string().optional(), contentType: z.string().default("SOCIAL_POST"), scheduledAt: z.string().datetime().optional() });

export const reportInput = z.object({
  name: z.string().trim().min(1).max(200),
  clientId: z.string().optional(),
  format: z.enum(["PDF", "CSV"]).default("PDF"),
  dateRange: z.enum(["last_7_days", "last_30_days", "last_90_days"]).default("last_30_days"),
  schedule: z.enum(["none", "weekly", "monthly"]).default("none"),
  configuration: z.record(z.unknown()).optional()
});

/** When a scheduled report next runs: a week or a calendar month after `from`. */
export function nextReportRun(schedule: "weekly" | "monthly", from = new Date()) {
  const next = new Date(from);
  if (schedule === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

export const automationInput = z.object({ name: z.string().min(1), description: z.string().optional(), trigger: z.string().min(1), action: z.string().min(1), campaignId: z.string().optional(), triggerConfig: z.record(z.unknown()).optional(), actionConfig: z.record(z.unknown()).optional(), isActive: z.boolean().optional() });

export const clientInput = z.object({ name: z.string().min(2), industry: z.string().optional(), website: z.string().optional(), contactName: z.string().optional(), contactEmail: z.string().optional(), contactPhone: z.string().optional(), currency: z.string().optional(), timezone: z.string().optional(), monthlyBudget: z.coerce.number().optional(), status: z.string().optional() });

export const teamInviteInput = z.object({ firstName: z.string().min(1), lastName: z.string().min(1), email: z.string().email(), jobTitle: z.string().optional(), role: z.string().optional() });

export function ok(data: unknown, meta?: Record<string, unknown>, init?: ResponseInit) { return NextResponse.json({ data, ...(meta ? { meta } : {}) }, init); }

export function error(message: string, status = 400, code = "BAD_REQUEST") { return NextResponse.json({ error: { code, message } }, { status }); }

export async function context(permission = "analytics.view") {
  try {
    const session = await requireTenant();
    if (!can(session.role, permission)) return { error: error(session.role === "API_KEY" ? "API keys are read-only." : "You do not have permission to perform this action.", 403) };
    return { session };
  } catch {
    // An API key over its per-minute limit gets 429 with Retry-After rather than a misleading 401.
    const bearer = (await headers()).get("authorization")?.replace(/^Bearer\s+/i, "");
    const { isApiKey, apiKeyRateLimited } = await import("@/lib/api-keys");
    if (isApiKey(bearer)) {
      const retryAfter = await apiKeyRateLimited(bearer);
      if (retryAfter) return { error: NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many requests for this API key." } }, { status: 429, headers: { "Retry-After": String(retryAfter) } }) };
    }
    return { error: error("Authentication required.", 401, "UNAUTHENTICATED") };
  }
}

/** A lead can only be assigned to someone in the same workspace (an outside ID would expose their name/email). */
export async function isLeadOwnerAllowed(workspaceId: string, ownerId: string) {
  const { isWorkspaceMember } = await import("@/lib/team-access");
  return isWorkspaceMember(workspaceId, ownerId);
}

/** AIError messages are written for users; anything else is logged and reported generically. */
export async function aiErrorResponse(cause: unknown) {
  const { AIError } = await import("@/lib/ai");
  if (cause instanceof AIError) {
    return NextResponse.json(
      { error: { code: cause.code, message: cause.message } },
      { status: cause.status, headers: cause.retryAfterSeconds ? { "Retry-After": String(cause.retryAfterSeconds) } : undefined }
    );
  }
  console.error("[ai] Unexpected failure:", cause);
  return error("AI generation failed. Please try again.", 502, "AI_FAILED");
}

/**
 * Writes that stay available when the subscription has lapsed: paying and billing, personal settings, notifications,
 * disconnecting integrations, and POST endpoints that only read (YouTube lookups).
 */
export const ALLOWED_WHILE_LOCKED = /^(billing(\/.*)?|notifications(\/.*)?|settings\/(profile|notifications|change-password|export|workspace\/delete|workspace\/restore|account\/delete|2fa\/[a-z-]+)|team\/leave|integrations\/disconnect|youtube\/(analytics|channel-info|dashboard|videos|validate-api-key|validate-channel)|youtube-ads\/(campaigns|dashboard|metrics|validate))$/;

export const NEEDS_VERIFIED_EMAIL = /^(billing\/(payu\/create-payment|razorpay\/create-order)|team|team\/[^/]+\/resend|integrations|integrations\/connect-credentials|integrations\/[^/]+\/connect|youtube\/connect|youtube-ads\/connect|social\/accounts)$/;

/** 402 for a write to a workspace whose subscription has lapsed (it stays readable), otherwise null. */
export async function lapsedSubscriptionResponse(workspaceId: string, path: string) {
  if (ALLOWED_WHILE_LOCKED.test(path)) return null;
  const { subscriptionWriteGuard } = await import("@/lib/subscription");
  return subscriptionWriteGuard(workspaceId);
}

export function teamActor(session: { userId: string; workspaceId: string; role: string; name?: string }) {
  return { userId: session.userId, workspaceId: session.workspaceId, role: session.role, name: session.name };
}

/** Base URL for emailed links: the request origin only for local development, otherwise APP_URL. */
export function inviteBaseUrl(request: Request, url: URL) {
  const reqProto = request.headers.get("x-forwarded-proto") || (url.protocol.replace(":", "") || "http");
  const reqHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const isLocal = reqHost?.includes("localhost") || reqHost?.includes("127.0.0.1");
  return isLocal ? `${reqProto}://${reqHost}` : (process.env.APP_URL || `${reqProto}://${reqHost}`);
}

export async function resolveV1Path(
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
      pathStr = url.pathname.replace(/^\/api\/v1\/?/, "").toLowerCase().trim();
    } catch {
      // ignore
    }
  }

  return pathStr.replace(/^\/+|\/+$/g, "");
}

/** Data & privacy endpoints (export, deletion, leaving): any member reaches them; owner-only ones check inside. */
export const COMPLIANCE_PATHS = /^(settings\/2fa(\/(setup|enable|disable|recovery-codes))?|settings\/privacy|settings\/export(\/[^/]+\/download)?|settings\/workspace\/(delete|restore)|settings\/account\/delete|team\/leave)$/;

export function getRequiredPermission(path: string, method: "GET" | "POST" = "GET"): string {
  if (COMPLIANCE_PATHS.test(path)) return "settings.view";
  if (path === "team" || path.startsWith("team/")) return "team.manage";
  if (path === "billing" || path.startsWith("billing")) return "billing.manage";
  if (path === "settings" || path.startsWith("settings")) return method === "GET" || path === "settings/profile" || path === "settings/notifications" || path === "settings/change-password" ? "settings.view" : "settings.manage";
  if (path === "clients" || path.startsWith("clients/")) return method === "GET" ? "client.view" : "client.edit";
  if (path === "leads" || path.startsWith("leads/")) return method === "GET" ? "lead.view" : "lead.edit";
  if (path === "content" || path.startsWith("content/")) return method === "GET" ? "content.view" : "content.edit";
  if (path.startsWith("social/")) return method === "GET" ? "social.view" : "social.edit";
  if (path === "automation" || path.startsWith("automation/")) return method === "GET" ? "automation.view" : "automation.manage";
  if (path === "reports" || path.startsWith("reports/")) return method === "GET" ? "report.view" : "report.edit";
  if (path === "campaigns" || path.startsWith("campaigns/")) return method === "GET" ? "campaign.view" : "campaign.edit";
  if (path.startsWith("ai/insights")) return "analytics.view";
  if (path.startsWith("ai/")) return method === "GET" ? "analytics.view" : "content.edit";
  return method === "GET" ? "analytics.view" : "settings.manage";
}
