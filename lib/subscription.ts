import { NextResponse } from "next/server";
import type { Plan, Subscription } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const TRIAL_DAYS = 14;
/** Days after the period ends (unpaid) before the workspace becomes read-only. */
export const GRACE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export type AccessState = "complimentary" | "trialing" | "active" | "past_due" | "cancelled" | "locked";

export type SubscriptionAccess = {
  state: AccessState;
  status: string;
  planSlug: string;
  planName: string;
  periodEnd: string;
  /** Whole days until the period ends (trial/paid/cancelled), null when it never ends. */
  daysLeft: number | null;
  /** When an unpaid workspace becomes read-only (set once the period has ended). */
  lockAt: string | null;
  locked: boolean;
  /** Why access is restricted or about to be. */
  reason: "trial_ended" | "payment_due" | "cancelled" | "paused" | null;
};

type SubscriptionWithPlan = Pick<Subscription, "status" | "currentPeriodEnd" | "complimentary" | "payuPaymentId" | "payuTxnId" | "razorpayPaymentId" | "stripeSubscriptionId"> & {
  plan?: Pick<Plan, "slug" | "name"> | null;
};

/** True if the workspace has ever paid (otherwise an ended period is an ended trial). */
export function hasPaid(sub: Pick<Subscription, "payuPaymentId" | "payuTxnId" | "razorpayPaymentId" | "stripeSubscriptionId">) {
  return Boolean(sub.payuPaymentId || sub.payuTxnId || sub.razorpayPaymentId || sub.stripeSubscriptionId);
}

/**
 * What a subscription allows right now. Computed from the stored dates, so access is correct even if the
 * lifecycle job hasn't run yet: a period that ended more than GRACE_DAYS ago locks the workspace (read-only).
 */
export function evaluateAccess(sub: SubscriptionWithPlan | null, now = new Date()): SubscriptionAccess {
  if (!sub) {
    return { state: "active", status: "NONE", planSlug: "", planName: "", periodEnd: "", daysLeft: null, lockAt: null, locked: false, reason: null };
  }
  const end = sub.currentPeriodEnd;
  const base = { status: sub.status, planSlug: sub.plan?.slug || "", planName: sub.plan?.name || "", periodEnd: end.toISOString() };
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY_MS));

  if (sub.complimentary) return { ...base, state: "complimentary", daysLeft: null, lockAt: null, locked: false, reason: null };
  if (sub.status === "PAUSED") return { ...base, state: "locked", daysLeft: null, lockAt: null, locked: true, reason: "paused" };
  if (sub.status === "CANCELLED") {
    const locked = now > end;
    return { ...base, state: locked ? "locked" : "cancelled", daysLeft, lockAt: end.toISOString(), locked, reason: "cancelled" };
  }
  if (now <= end) {
    return { ...base, state: sub.status === "TRIALING" ? "trialing" : "active", daysLeft, lockAt: null, locked: false, reason: null };
  }
  // The period has ended without payment: a grace period, then read-only.
  const lockAt = new Date(end.getTime() + GRACE_DAYS * DAY_MS);
  const locked = now > lockAt;
  const reason = sub.status === "TRIALING" || !hasPaid(sub) ? "trial_ended" : "payment_due";
  return { ...base, state: locked ? "locked" : "past_due", daysLeft: 0, lockAt: lockAt.toISOString(), locked, reason };
}

export async function getSubscriptionAccess(workspaceId: string, now = new Date()) {
  const sub = await prisma.subscription.findUnique({ where: { workspaceId }, include: { plan: { select: { slug: true, name: true } } } });
  return evaluateAccess(sub, now);
}

/**
 * For routes that change data: a 402 response when the workspace's subscription has lapsed (reads stay
 * available, and billing stays usable so the workspace can be reactivated), otherwise null.
 */
export async function subscriptionWriteGuard(workspaceId: string) {
  const access = await getSubscriptionAccess(workspaceId);
  if (!access.locked) return null;
  const message = access.reason === "trial_ended"
    ? "Your free trial has ended. Choose a plan in Billing to keep making changes; your data is safe and still viewable."
    : access.reason === "cancelled"
      ? "Your subscription has ended. Reactivate a plan in Billing to keep making changes; your data is safe and still viewable."
      : "Your subscription is inactive because payment is overdue. Renew in Billing to keep making changes; your data is safe and still viewable.";
  return NextResponse.json({ error: { code: "SUBSCRIPTION_INACTIVE", message } }, { status: 402 });
}

/** The trial every new workspace starts with: the Pro plan for TRIAL_DAYS. */
export function trialSubscriptionData(planId: string, planSlug: string, now = new Date()) {
  return {
    planId,
    planSlug,
    status: "TRIALING" as const,
    interval: "MONTHLY" as const,
    billingInterval: "MONTHLY",
    currentPeriodStart: now,
    currentPeriodEnd: new Date(now.getTime() + TRIAL_DAYS * DAY_MS),
    cancelAtPeriodEnd: false,
    complimentary: false,
    lastLifecycleNotice: null
  };
}

/**
 * The period a successful payment buys. Renewing the same plan while it is still active extends it from the
 * current end (paying early loses nothing); anything else (trial, new plan, lapsed) starts now.
 */
export function paidPeriod(
  current: Pick<Subscription, "status" | "currentPeriodStart" | "currentPeriodEnd" | "complimentary"> & { planSlug?: string | null } | null,
  planSlug: string,
  interval: "monthly" | "yearly",
  now = new Date()
) {
  const months = interval === "yearly" ? 12 : 1;
  if (current && current.status === "ACTIVE" && !current.complimentary && current.planSlug === planSlug && current.currentPeriodEnd > now) {
    return { start: current.currentPeriodStart, end: addMonths(current.currentPeriodEnd, months) };
  }
  return { start: now, end: addMonths(now, months) };
}

/** Adds calendar months, clamping to the month's last day (Jan 31 + 1 month = Feb 28/29, not Mar 3). */
export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/**
 * Start of the current monthly allowance window. AI credits are monthly even on yearly plans, so the window
 * is the latest monthly anniversary of the period start that isn't in the future.
 */
export function monthlyWindowStart(periodStart: Date, now = new Date()) {
  if (periodStart > now) return periodStart;
  let months = (now.getUTCFullYear() - periodStart.getUTCFullYear()) * 12 + (now.getUTCMonth() - periodStart.getUTCMonth());
  while (months > 0 && addMonths(periodStart, months) > now) months -= 1;
  return addMonths(periodStart, Math.max(0, months));
}
