import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendBillingNoticeEmail } from "@/lib/email";
import { GRACE_DAYS, addMonths, hasPaid } from "@/lib/subscription";

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_DAYS = 7;

type Notice = "7d" | "1d" | "expired" | "locked";

const subscriptionInclude = {
  plan: { select: { name: true } },
  workspace: { select: { id: true, name: true, ownerId: true, billingEmail: true, owner: { select: { email: true, firstName: true } } } }
} as const;

function findSubscriptions(where: Prisma.SubscriptionWhereInput) {
  return prisma.subscription.findMany({ where, include: subscriptionInclude, take: 500 });
}

type LifecycleSubscription = Awaited<ReturnType<typeof findSubscriptions>>[number];

const formatDate = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Each notice is tied to the period it is about, so a renewed period gets its own reminders. */
const noticeKey = (sub: { currentPeriodEnd: Date }, notice: Notice) => `${sub.currentPeriodEnd.toISOString()}:${notice}`;

/** Atomically records the notice; false if it was already sent (by an earlier run or another instance). */
async function claimNotice(sub: { id: string; currentPeriodEnd: Date }, notice: Notice, extra: Record<string, unknown> = {}) {
  const key = noticeKey(sub, notice);
  const claimed = await prisma.subscription.updateMany({
    where: { id: sub.id, currentPeriodEnd: sub.currentPeriodEnd, OR: [{ lastLifecycleNotice: null }, { lastLifecycleNotice: { not: key } }] },
    data: { lastLifecycleNotice: key, ...extra }
  });
  return claimed.count > 0;
}

function noticeContent(sub: LifecycleSubscription, notice: Notice, now: Date) {
  const trial = sub.status === "TRIALING" || !hasPaid(sub);
  const ws = sub.workspace.name;
  const plan = sub.plan?.name || "Pro";
  const end = formatDate(sub.currentPeriodEnd);
  const lockDate = formatDate(new Date(sub.currentPeriodEnd.getTime() + GRACE_DAYS * DAY_MS));
  const days = Math.max(1, Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / DAY_MS));
  const when = days <= 1 ? "tomorrow" : `in ${days} days`;

  if (notice === "7d" || notice === "1d") {
    return trial
      ? { subject: `Your MarketerOS trial ends ${when}`, heading: `Your trial ends on ${end}`, body: `your ${plan} trial for "${ws}" ends on ${end}. Choose a plan to keep full access. Without one, the workspace becomes read-only ${GRACE_DAYS} days later.`, actionLabel: "Choose a plan" }
      : { subject: `Your MarketerOS subscription ends ${when}`, heading: `Your ${plan} plan ends on ${end}`, body: `the ${plan} plan for "${ws}" is paid until ${end}. Renew in Billing to keep full access without interruption.`, actionLabel: "Renew now" };
  }
  if (notice === "expired") {
    return trial
      ? { subject: "Your MarketerOS trial has ended", heading: "Your free trial has ended", body: `the trial for "${ws}" ended on ${end}. Choose a plan by ${lockDate} to keep making changes; after that the workspace becomes read-only. Your data stays safe either way.`, actionLabel: "Choose a plan" }
      : { subject: "Your MarketerOS payment is due", heading: "Your subscription has ended", body: `the ${plan} plan for "${ws}" ended on ${end}. Renew by ${lockDate} to keep making changes; after that the workspace becomes read-only. Your data stays safe either way.`, actionLabel: "Renew now" };
  }
  return { subject: "Your MarketerOS workspace is now read-only", heading: "Your workspace is read-only", body: `"${ws}" no longer has an active plan, so it is now read-only: you can view everything, but changes are paused. Choose a plan to continue where you left off.`, actionLabel: "Reactivate" };
}

async function notify(sub: LifecycleSubscription, notice: Notice, now: Date) {
  const content = noticeContent(sub, notice, now);
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const to = sub.workspace.billingEmail || sub.workspace.owner?.email;
  await prisma.notification.create({
    data: { workspaceId: sub.workspace.id, userId: sub.workspace.ownerId, type: "BILLING", title: content.heading, message: content.body.charAt(0).toUpperCase() + content.body.slice(1), link: "/billing" }
  });
  if (!to) return;
  const result = await sendBillingNoticeEmail({ to, recipientName: sub.workspace.owner?.firstName || "", ...content, actionUrl: `${baseUrl}/billing` });
  if (!result.delivered) console.warn(`[billing] ${notice} notice for workspace ${sub.workspace.id} was not emailed: ${result.error || "not delivered"}`);
}

/**
 * Moves subscriptions through their lifecycle and sends each reminder once:
 *  - 7 days and 1 day before a trial or paid period ends: a reminder;
 *  - when it ends unpaid: PAST_DUE, with GRACE_DAYS before the workspace becomes read-only;
 *  - when the grace period is over: a read-only notice (the lock itself is enforced from the dates);
 *  - complimentary subscriptions roll their period forward so monthly allowances keep resetting.
 * Idempotent: safe to run repeatedly and on several instances.
 */
export async function runBillingLifecycle(now = new Date()) {
  const counts = { reminders: 0, expired: 0, locked: 0, complimentaryRenewed: 0 };

  const complimentary = await prisma.subscription.findMany({ where: { complimentary: true, currentPeriodEnd: { lte: now } }, select: { id: true, currentPeriodEnd: true }, take: 500 });
  for (const sub of complimentary) {
    let start = sub.currentPeriodEnd;
    let end = addMonths(start, 1);
    while (end <= now) { start = end; end = addMonths(end, 1); }
    await prisma.subscription.update({ where: { id: sub.id }, data: { currentPeriodStart: start, currentPeriodEnd: end } });
    counts.complimentaryRenewed += 1;
  }

  const live: Prisma.SubscriptionWhereInput = { complimentary: false, status: { in: ["TRIALING", "ACTIVE"] } };

  const endingSoon = await findSubscriptions({ ...live, cancelAtPeriodEnd: false, currentPeriodEnd: { gt: now, lte: new Date(now.getTime() + REMINDER_DAYS * DAY_MS) } });
  for (const sub of endingSoon) {
    const notice: Notice = sub.currentPeriodEnd.getTime() - now.getTime() <= DAY_MS ? "1d" : "7d";
    // Once the 1-day reminder went out, the 7-day one is never sent afterwards.
    if (sub.lastLifecycleNotice === noticeKey(sub, "1d")) continue;
    if (await claimNotice(sub, notice)) { await notify(sub, notice, now); counts.reminders += 1; }
  }

  const ended = await findSubscriptions({ ...live, currentPeriodEnd: { lte: now } });
  for (const sub of ended) {
    if (await claimNotice(sub, "expired", { status: "PAST_DUE" })) { await notify(sub, "expired", now); counts.expired += 1; }
  }

  const lapsed = await findSubscriptions({ complimentary: false, status: "PAST_DUE", currentPeriodEnd: { lt: new Date(now.getTime() - GRACE_DAYS * DAY_MS) } });
  for (const sub of lapsed) {
    if (sub.lastLifecycleNotice === noticeKey(sub, "locked")) continue;
    if (await claimNotice(sub, "locked")) { await notify(sub, "locked", now); counts.locked += 1; }
  }

  return counts;
}
