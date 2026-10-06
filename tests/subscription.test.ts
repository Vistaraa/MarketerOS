import { describe, expect, it } from "vitest";
import { addMonths, evaluateAccess, monthlyWindowStart, paidPeriod } from "@/lib/subscription";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-06T12:00:00.000Z");
const at = (offsetDays: number) => new Date(now.getTime() + offsetDays * DAY);
const sub = (status: string, endOffsetDays: number, extra: Record<string, unknown> = {}) => ({
  status: status as never,
  currentPeriodEnd: at(endOffsetDays),
  complimentary: false,
  payuPaymentId: null,
  payuTxnId: null,
  razorpayPaymentId: null,
  stripeSubscriptionId: null,
  plan: { slug: "pro", name: "Pro" },
  ...extra
});

describe("evaluateAccess", () => {
  it("counts down a running trial", () => {
    const a = evaluateAccess(sub("TRIALING", 10), now);
    expect(a).toMatchObject({ state: "trialing", daysLeft: 10, locked: false, reason: null });
  });

  it("gives an ended trial a 3-day grace period, then locks it", () => {
    expect(evaluateAccess(sub("TRIALING", -1), now)).toMatchObject({ state: "past_due", locked: false, reason: "trial_ended", lockAt: at(2).toISOString() });
    expect(evaluateAccess(sub("PAST_DUE", -2.9), now)).toMatchObject({ state: "past_due", locked: false });
    expect(evaluateAccess(sub("PAST_DUE", -3.1), now)).toMatchObject({ state: "locked", locked: true, reason: "trial_ended" });
  });

  it("tells an unpaid renewal apart from an ended trial", () => {
    expect(evaluateAccess(sub("PAST_DUE", -1, { payuPaymentId: "403993715" }), now)).toMatchObject({ state: "past_due", reason: "payment_due" });
  });

  it("locks even if the lifecycle job never ran (status still ACTIVE)", () => {
    expect(evaluateAccess(sub("ACTIVE", -5, { payuPaymentId: "403993715" }), now)).toMatchObject({ locked: true, reason: "payment_due" });
  });

  it("keeps a cancelled plan usable until its period ends, with no grace period", () => {
    expect(evaluateAccess(sub("CANCELLED", 4), now)).toMatchObject({ state: "cancelled", locked: false, daysLeft: 4 });
    expect(evaluateAccess(sub("CANCELLED", -0.01), now)).toMatchObject({ state: "locked", locked: true, reason: "cancelled" });
  });

  it("never locks complimentary workspaces", () => {
    expect(evaluateAccess(sub("ACTIVE", -400, { complimentary: true }), now)).toMatchObject({ state: "complimentary", locked: false, daysLeft: null });
    expect(evaluateAccess(sub("CANCELLED", -400, { complimentary: true }), now).locked).toBe(false);
  });

  it("locks paused subscriptions", () => {
    expect(evaluateAccess(sub("PAUSED", 20), now)).toMatchObject({ locked: true, reason: "paused" });
  });
});

describe("paidPeriod", () => {
  const active = { status: "ACTIVE" as const, complimentary: false, planSlug: "pro", currentPeriodStart: at(-20), currentPeriodEnd: at(10) };

  it("extends an early renewal of the same plan from the current end", () => {
    expect(paidPeriod(active, "pro", "monthly", now)).toEqual({ start: at(-20), end: addMonths(at(10), 1) });
  });

  it("starts now for a trial, a plan change, or a lapsed plan", () => {
    const fresh = { start: now, end: addMonths(now, 1) };
    expect(paidPeriod({ ...active, status: "TRIALING" as const }, "pro", "monthly", now)).toEqual(fresh);
    expect(paidPeriod(active, "business", "monthly", now)).toEqual(fresh);
    expect(paidPeriod({ ...active, currentPeriodEnd: at(-1) }, "pro", "monthly", now)).toEqual(fresh);
    expect(paidPeriod(null, "pro", "yearly", now)).toEqual({ start: now, end: addMonths(now, 12) });
  });
});

describe("date helpers", () => {
  it("clamps month ends", () => {
    expect(addMonths(new Date("2026-01-31T10:00:00Z"), 1).toISOString()).toBe("2026-02-28T10:00:00.000Z");
    expect(addMonths(new Date("2028-01-31T10:00:00Z"), 1).toISOString()).toBe("2028-02-29T10:00:00.000Z");
    expect(addMonths(new Date("2026-03-15T10:00:00Z"), 12).toISOString()).toBe("2027-03-15T10:00:00.000Z");
  });

  it("resets monthly allowances on yearly plans", () => {
    const start = new Date("2026-01-15T00:00:00Z");
    expect(monthlyWindowStart(start, new Date("2026-01-20T00:00:00Z")).toISOString()).toBe("2026-01-15T00:00:00.000Z");
    expect(monthlyWindowStart(start, new Date("2026-10-06T00:00:00Z")).toISOString()).toBe("2026-09-15T00:00:00.000Z");
    expect(monthlyWindowStart(start, new Date("2026-10-14T23:59:59Z")).toISOString()).toBe("2026-09-15T00:00:00.000Z");
    expect(monthlyWindowStart(start, new Date("2026-10-15T00:00:00Z")).toISOString()).toBe("2026-10-15T00:00:00.000Z");
  });
});
