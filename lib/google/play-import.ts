import { auth as googleAuth } from "@googleapis/androidpublisher";
import type { PlayReleaseStatus, PlayReleaseTrack } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDecryptedGooglePlayIntegration } from "@/lib/google/play-console";

/*
 * Google Play importer: releases (per track), recent reviews (inbox + daily rating) and Android vitals (crash/ANR
 * rates, daily users) through Google's REST APIs. Base URLs can be pointed at a stub server in end-to-end tests.
 * Store-listing and audience statistics are only published as Cloud Storage report files, which this doesn't read.
 */
const PLAY_API = process.env.GOOGLE_PLAY_API_BASE_URL || "https://androidpublisher.googleapis.com";
const REPORTING_API = process.env.PLAY_REPORTING_API_BASE_URL || "https://playdeveloperreporting.googleapis.com";
const GOOGLE_TOKEN_URL = process.env.GOOGLE_OAUTH_TOKEN_URL || "https://oauth2.googleapis.com/token";
const SCOPES = ["https://www.googleapis.com/auth/androidpublisher", "https://www.googleapis.com/auth/playdeveloperreporting"];
const VITALS_DAYS = 30;
const MAX_REVIEW_PAGES = 5;

const TRACKS: Record<string, PlayReleaseTrack> = { production: "PRODUCTION", beta: "OPEN_TESTING", alpha: "CLOSED_TESTING", internal: "INTERNAL_TESTING" };
const STATUSES: Record<string, PlayReleaseStatus> = { completed: "COMPLETED", inProgress: "IN_PROGRESS", halted: "HALTED", draft: "DRAFT" };

type Credentials = NonNullable<Awaited<ReturnType<typeof getDecryptedGooglePlayIntegration>>>;
type GoogleDate = { year: number; month: number; day: number };

async function accessToken(creds: Credentials) {
  if (creds.serviceAccount) {
    const client = new googleAuth.JWT({ email: creds.serviceAccount.client_email, key: creds.serviceAccount.private_key.replace(/\\n/g, "\n"), scopes: SCOPES });
    const { token } = await client.getAccessToken();
    if (!token) throw new Error("Google didn't issue an access token for the service account.");
    return token;
  }
  if (creds.oauth) {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: creds.oauth.clientId, client_secret: creds.oauth.clientSecret, refresh_token: creds.oauth.refreshToken, grant_type: "refresh_token" }),
      signal: AbortSignal.timeout(20_000)
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) throw new Error(`Google rejected the Play credentials: ${body.error_description || body.error || res.status}.`);
    return body.access_token as string;
  }
  throw new Error("Google Play credentials are incomplete. Reconnect Google Play.");
}

async function api<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) }, signal: AbortSignal.timeout(30_000) });
  if (res.status === 204) return {} as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Google Play API ${res.status}: ${typeof body?.error?.message === "string" ? body.error.message.slice(0, 300) : "request failed"}`);
  return body as T;
}

const toGoogleDate = (d: Date): GoogleDate => ({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
const fromGoogleDate = (d: GoogleDate) => new Date(Date.UTC(d.year, d.month - 1, d.day));
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Releases from every track, read through a temporary (discarded) edit. */
async function importReleases(token: string, workspaceId: string, appId: string, packageName: string) {
  const base = `${PLAY_API}/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/edits`;
  const edit = await api<{ id: string }>(token, base, { method: "POST", body: "{}" });
  try {
    const { tracks = [] } = await api<{ tracks?: Array<{ track: string; releases?: Array<{ name?: string; versionCodes?: string[]; status?: string; userFraction?: number; releaseNotes?: Array<{ language: string; text: string }> }> }> }>(token, `${base}/${edit.id}/tracks`);
    let count = 0;
    for (const track of tracks) {
      for (const release of track.releases || []) {
        const codes = (release.versionCodes || []).map(Number).filter(Number.isFinite);
        if (!codes.length) continue;
        const versionCode = Math.max(...codes);
        const status = STATUSES[release.status || ""] || "COMPLETED";
        const data = {
          versionName: release.name || String(versionCode),
          status,
          userFraction: release.userFraction ?? null,
          rolloutPercentage: release.userFraction !== undefined ? release.userFraction * 100 : status === "COMPLETED" ? 100 : 0,
          notes: (release.releaseNotes?.find((n) => n.language.startsWith("en")) || release.releaseNotes?.[0])?.text || null
        };
        const trackEnum = TRACKS[track.track] || "CLOSED_TESTING";
        const existing = await prisma.playConsoleRelease.findFirst({ where: { appId, track: trackEnum, versionCode }, select: { id: true } });
        if (existing) await prisma.playConsoleRelease.update({ where: { id: existing.id }, data });
        else await prisma.playConsoleRelease.create({ data: { workspaceId, appId, track: trackEnum, versionCode, ...data } });
        count += 1;
      }
    }
    return count;
  } finally {
    await api(token, `${base}/${edit.id}`, { method: "DELETE" }).catch(() => undefined);
  }
}

/** Reviews from the last week (all the API provides): new ones go to the inbox; per-day averages go to the KPIs. */
async function importReviews(token: string, workspaceId: string, appId: string, packageName: string) {
  type Review = { reviewId: string; authorName?: string; comments?: Array<{ userComment?: { text?: string; starRating?: number; lastModified?: { seconds: string } } }> };
  const reviews: Review[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_REVIEW_PAGES; page++) {
    const url = new URL(`${PLAY_API}/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/reviews`);
    url.searchParams.set("maxResults", "100");
    if (pageToken) url.searchParams.set("token", pageToken);
    const body = await api<{ reviews?: Review[]; tokenPagination?: { nextPageToken?: string } }>(token, url.toString());
    reviews.push(...(body.reviews || []));
    pageToken = body.tokenPagination?.nextPageToken;
    if (!pageToken) break;
  }
  const perDay = new Map<string, { sum: number; count: number }>();
  let added = 0;
  for (const review of reviews) {
    const comment = review.comments?.find((c) => c.userComment)?.userComment;
    if (!comment?.starRating) continue;
    const at = comment.lastModified?.seconds ? new Date(Number(comment.lastModified.seconds) * 1000) : new Date();
    const day = perDay.get(dayKey(at)) || { sum: 0, count: 0 };
    perDay.set(dayKey(at), { sum: day.sum + comment.starRating, count: day.count + 1 });
    const text = (comment.text || "").trim();
    const created = await prisma.playConsoleInboxMessage.createMany({
      data: [{
        workspaceId,
        appId,
        externalId: `review:${review.reviewId}`,
        category: comment.starRating <= 2 ? "IMPORTANT" : "EVERYTHING_ELSE",
        severity: comment.starRating <= 2 ? "WARNING" : "INFO",
        title: `${comment.starRating}★ review from ${review.authorName || "a Google Play user"}`,
        summary: text ? text.slice(0, 280) : "(No written comment)",
        body: text || null,
        actionUrl: "https://play.google.com/console/",
        receivedAt: at
      }],
      skipDuplicates: true
    });
    added += created.count;
  }
  for (const [key, { sum, count }] of Array.from(perDay)) {
    const date = new Date(`${key}T00:00:00.000Z`);
    const ratings = { ratingAverage: Math.round((sum / count) * 100) / 100, ratingsCount: count };
    await prisma.playConsoleKpiDaily.upsert({ where: { appId_date: { appId, date } }, update: ratings, create: { workspaceId, appId, date, ...ratings } });
  }
  return { reviews: reviews.length, newInboxMessages: added };
}

/** Daily crash and ANR rates and daily users from Android vitals (data lags about two days). */
async function importVitals(token: string, workspaceId: string, appId: string, packageName: string) {
  const end = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - VITALS_DAYS * 24 * 60 * 60 * 1000);
  type Row = { startTime: GoogleDate; metrics?: Array<{ metric: string; decimalValue?: { value: string } }> };
  const query = (set: string, metric: string) =>
    api<{ rows?: Row[] }>(token, `${REPORTING_API}/v1beta1/apps/${encodeURIComponent(packageName)}/${set}:query`, {
      method: "POST",
      body: JSON.stringify({ timelineSpec: { aggregationPeriod: "DAILY", startTime: { ...toGoogleDate(start), timeZone: { id: "America/Los_Angeles" } }, endTime: { ...toGoogleDate(end), timeZone: { id: "America/Los_Angeles" } } }, metrics: [metric, "distinctUsers"], pageSize: VITALS_DAYS + 1 })
    });
  const [crash, anr] = await Promise.all([query("crashRateMetricSet", "crashRate"), query("anrRateMetricSet", "anrRate")]);
  const days = new Map<string, { date: Date; crashRate?: number; anrRate?: number; activeDevices?: number }>();
  const value = (row: Row, name: string) => {
    const v = row.metrics?.find((m) => m.metric === name)?.decimalValue?.value;
    return v === undefined ? undefined : Number(v);
  };
  for (const [rows, field] of [[crash.rows || [], "crashRate"], [anr.rows || [], "anrRate"]] as const) {
    for (const row of rows) {
      const date = fromGoogleDate(row.startTime);
      const entry = days.get(dayKey(date)) || { date };
      entry[field] = value(row, field);
      entry.activeDevices = value(row, "distinctUsers") ?? entry.activeDevices;
      days.set(dayKey(date), entry);
    }
  }
  for (const entry of Array.from(days.values())) {
    const data = { crashRate: entry.crashRate ?? null, anrRate: entry.anrRate ?? null, activeDevices: entry.activeDevices !== undefined ? Math.round(entry.activeDevices) : null };
    await prisma.playConsoleKpiDaily.upsert({ where: { appId_date: { appId, date: entry.date } }, update: data, create: { workspaceId, appId, date: entry.date, ...data } });
  }
  return days.size;
}

/**
 * Background job: imports everything available for the workspace's Google Play app. Releases and reviews are
 * required (they prove the credentials work); vitals are best-effort, since the Reporting API must be enabled
 * separately, and their failure is reported as a warning.
 */
export async function importGooglePlay(workspaceId: string) {
  const creds = await getDecryptedGooglePlayIntegration(workspaceId);
  if (!creds) throw new Error("Google Play isn't connected.");
  if (!creds.packageName) throw new Error("Google Play is connected without a package name. Reconnect it with your app's package name.");
  const startedAt = new Date();
  await prisma.integration.update({ where: { id: creds.integrationId }, data: { lastSyncStarted: startedAt } });
  const token = await accessToken(creds);
  const app = await prisma.playConsoleApp.upsert({
    where: { workspaceId_packageName: { workspaceId, packageName: creds.packageName } },
    update: { integrationId: creds.integrationId },
    create: { workspaceId, packageName: creds.packageName, appTitle: creds.appTitle, integrationId: creds.integrationId }
  });
  const releases = await importReleases(token, workspaceId, app.id, creds.packageName);
  const reviews = await importReviews(token, workspaceId, app.id, creds.packageName);
  const warnings: string[] = [];
  let vitalsDays = 0;
  try {
    vitalsDays = await importVitals(token, workspaceId, app.id, creds.packageName);
  } catch (error) {
    warnings.push(`Android vitals weren't imported: ${error instanceof Error ? error.message : "unknown error"} (enable the Play Developer Reporting API for this project).`);
  }
  const recordsSynced = releases + reviews.newInboxMessages + vitalsDays;
  await prisma.integrationSyncLog.create({ data: { integrationId: creds.integrationId, status: warnings.length ? "PARTIAL" : "COMPLETED", recordsSynced, startedAt, finishedAt: new Date(), durationMs: Date.now() - startedAt.getTime(), errorMessage: warnings[0] || null, metadata: { releases, ...reviews, vitalsDays } } });
  await prisma.integration.update({ where: { id: creds.integrationId }, data: { status: "CONNECTED", errorMessage: null, lastSyncedAt: new Date(), lastSyncFinished: new Date() } });
  return { releases, ...reviews, vitalsDays, warnings };
}
