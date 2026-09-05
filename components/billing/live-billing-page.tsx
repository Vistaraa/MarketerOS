"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, ExternalLink } from "lucide-react";
import { AppShell, Card, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import type { ApiResponse } from "@/lib/api-contracts";
import { cn, money } from "@/lib/utils";

type BillingData = {
  subscription: {
    status: string;
    interval: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd?: string;
    plan: { id: string; name: string; monthlyPrice: number; yearlyPrice: number };
  } | null;
  plans: Array<{ id: string; name: string; monthlyPrice: number; yearlyPrice: number; features?: unknown }>;
  invoices: Array<{ id: string; invoiceNumber: string; total: unknown; status: string; invoiceDate: string; downloadUrl?: string | null }>;
};

export function LiveBillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    fetch("/api/v1/billing")
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse<BillingData>;
        if (!response.ok) throw new Error(payload.error?.message || "Unable to load billing.");
        return payload.data;
      })
      .then(setData)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load billing."));
  }, []);

  async function action(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Billing action failed.");
      if (payload.data?.checkoutUrl) window.location.assign(payload.data.checkoutUrl);
      if (payload.data?.portalUrl) window.location.assign(payload.data.portalUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Billing action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Billing">
      <div className="space-y-6">
        <PageHeading
          title="Billing & Subscription"
          description="Manage your workspace plan, payment methods, and invoices."
          action={
            <button
              onClick={() => action("billing/portal")}
              disabled={busy}
              className="btn-secondary"
            >
              <CreditCard size={13} /> Customer Portal
            </button>
          }
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Interval Selector Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 text-xs w-fit dark:border-zinc-800 dark:bg-zinc-900">
          <button
            onClick={() => setInterval("monthly")}
            className={cn(
              "rounded-md px-3 py-1 font-medium transition",
              interval === "monthly"
                ? "bg-zinc-100 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
            )}
          >
            Monthly billing
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={cn(
              "rounded-md px-3 py-1 font-medium transition",
              interval === "yearly"
                ? "bg-zinc-100 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
            )}
          >
            Annual billing (Save 20%)
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.plans.map((plan) => {
            const isCurrent = data.subscription?.plan.id === plan.id;
            return (
              <div
                key={plan.id}
                className={cn(
                  "flex flex-col justify-between rounded-xl border p-6 shadow-2xs transition-all dark:bg-zinc-950/60",
                  isCurrent
                    ? "border-zinc-900 bg-zinc-50/50 dark:border-zinc-100"
                    : "border-zinc-200/90 bg-white dark:border-zinc-800"
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{plan.name}</h2>
                    {isCurrent && <StatusBadge status="Connected" />}
                  </div>

                  <div className="mt-4">
                    <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      {money(interval === "monthly" ? plan.monthlyPrice : plan.yearlyPrice)}
                    </span>
                    <span className="text-xs text-zinc-400">/{interval === "monthly" ? "mo" : "yr"}</span>
                  </div>

                  <div className="mt-5 space-y-2 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                    <p className="flex items-center gap-2">
                      <Check size={13} className="text-zinc-900 dark:text-zinc-100" />
                      <span>Multi-channel ad campaign manager</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Check size={13} className="text-zinc-900 dark:text-zinc-100" />
                      <span>Live Google & Meta API synchronization</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Check size={13} className="text-zinc-900 dark:text-zinc-100" />
                      <span>Lead tracking & revenue attribution</span>
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => action("billing/checkout", { planId: plan.id, interval })}
                    disabled={busy || isCurrent}
                    className={cn(
                      "w-full py-2 text-xs font-semibold rounded-lg shadow-2xs transition",
                      isCurrent
                        ? "border border-zinc-200 bg-zinc-100 text-zinc-400 cursor-default dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-500"
                        : "btn-primary"
                    )}
                  >
                    {isCurrent ? "Current Plan" : "Upgrade Plan"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Invoices Table */}
        <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Invoices</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {data?.subscription
                  ? `Renews on ${data.subscription.currentPeriodEnd ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString() : "auto-renewal"}`
                  : "No active paid subscription"}
              </p>
            </div>
          </div>

          <div className="divide-y divide-zinc-100 text-xs dark:divide-zinc-800 font-medium">
            {data?.invoices.map((invoice) => (
              <div className="flex items-center justify-between p-4" key={invoice.id}>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{invoice.invoiceNumber}</span>
                <span className="text-zinc-600 dark:text-zinc-400">{money(Number(invoice.total))}</span>
                <span className="text-zinc-500">{invoice.status}</span>
                {invoice.downloadUrl && (
                  <a
                    href={invoice.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            ))}
            {data && !data.invoices.length && (
              <div className="p-8 text-center text-xs text-zinc-400">
                Invoices will appear after subscription billing runs.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
