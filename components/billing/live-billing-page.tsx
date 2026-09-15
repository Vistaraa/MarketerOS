"use client";

import React, { useEffect, useState } from "react";
import {
  CreditCard,
  Check,
  Zap,
  TrendingUp,
  FileText,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  Download,
  Plus,
  Trash2,
  Lock,
  ChevronRight,
  Info,
  Calendar,
  X,
  CheckCircle2,
  RefreshCw,
  Building,
  Mail
} from "lucide-react";
import { AppShell, Card, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import { CustomDialog } from "@/components/ui/custom-dialog";
import type { ApiResponse } from "@/lib/api-contracts";
import type { BillingOverviewPayload, ResourceUsageItem } from "@/lib/billing-service";
import { cn, money } from "@/lib/utils";

type ActiveTab = "overview" | "plan" | "pricing" | "invoices" | "payment-methods" | "history" | "credits" | "settings";

export function LiveBillingPage() {
  const [data, setData] = useState<BillingOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: "info" | "success" | "warning" | "error" | "confirm";
    confirmText?: string;
    cancelText?: string;
    confirmTone?: "primary" | "danger" | "warning";
    onConfirm?: () => void;
  }>({ isOpen: false, message: "" });

  // Upgrade Modal State
  const [selectedPlanToUpgrade, setSelectedPlanToUpgrade] = useState<any | null>(null);
  // Invoice Drawer State
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  // Add Payment Method Modal
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);

  // Billing Contact Form State
  const [contactForm, setContactForm] = useState({
    companyName: "",
    billingEmail: "",
    taxId: "US987654321",
    address: "100 Marketing Way, Suite 400, San Francisco, CA 94105",
    country: "United States",
    currency: "USD"
  });

  const loadBilling = () => {
    setLoading(true);
    setError(null);
    fetch("/api/v1/billing")
      .then(async (res) => {
        const payload = (await res.json()) as ApiResponse<BillingOverviewPayload>;
        if (!res.ok) throw new Error(payload.error?.message || "Failed to load billing details.");
        return payload.data;
      })
      .then((payload) => {
        setData(payload);
        if (payload.billingContact) {
          setContactForm((prev) => ({
            ...prev,
            companyName: payload.billingContact.companyName || prev.companyName,
            billingEmail: payload.billingContact.billingEmail || prev.billingEmail
          }));
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load billing data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBilling();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePlanChange = async (planSlug: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: planSlug, interval: billingInterval })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || "Plan update failed.");
      triggerToast(`Plan successfully updated to ${planSlug.toUpperCase()}!`);
      setSelectedPlanToUpgrade(null);
      loadBilling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change subscription plan.");
    } finally {
      setBusy(false);
    }
  };

  const handleCancelSubscription = async () => {
    setDialogConfig({
      isOpen: true,
      title: "Cancel Subscription",
      message: "Are you sure you want to cancel your subscription? Your workspace features will remain active until the end of the billing period.",
      type: "confirm",
      confirmText: "Cancel Subscription",
      confirmTone: "danger",
      onConfirm: async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/v1/billing/cancel", { method: "POST" });
          const payload = await res.json();
          if (!res.ok) throw new Error(payload.error?.message || "Failed to cancel subscription.");
          triggerToast("Subscription set to cancel at period end.");
          loadBilling();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to cancel subscription.");
        } finally {
          setBusy(false);
        }
      }
    });
  };

  if (loading) {
    return (
      <AppShell title="Billing">
        <div className="flex h-64 items-center justify-center text-xs text-zinc-500">
          <RefreshCw size={18} className="animate-spin mr-2 text-zinc-400" /> Loading workspace billing & subscriptions...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Billing">
      <div className="space-y-6 text-xs">
        {/* Page Heading */}
        <PageHeading
          title="Billing & Subscription Engine"
          description="Manage workspace plans, usage limits, invoices, credit allocations, and payment settings."
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("pricing")}
                className="btn-primary flex items-center gap-1.5"
              >
                <Sparkles size={13} /> Upgrade Plan
              </button>
            </div>
          }
        />

        {/* Toast Alert */}
        {toastMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300 animate-in fade-in">
            <CheckCircle2 size={15} className="text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-rose-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:underline">Dismiss</button>
          </div>
        )}

        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-zinc-200/80 overflow-x-auto dark:border-zinc-800 text-xs font-semibold">
          {[
            { id: "overview", label: "Overview" },
            { id: "plan", label: "Current Plan & Limits" },
            { id: "pricing", label: "Pricing & Plans" },
            { id: "invoices", label: "Invoices & Receipts" },
            { id: "payment-methods", label: "Payment Methods" },
            { id: "history", label: "Billing History" },
            { id: "credits", label: "AI Credits" },
            { id: "settings", label: "Billing Settings" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                  : "border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && data && (
          <div className="space-y-6">
            {/* Subscription Status Card */}
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                  <CreditCard size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{data.kpis.currentPlanName}</h3>
                    <StatusBadge status={data.subscription?.status === "ACTIVE" ? "Connected" : "Paused"} />
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Billed {data.kpis.billingCycle.toLowerCase()} · Next billing date: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{data.kpis.nextBillingDate}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("pricing")}
                  className="btn-primary py-2 px-4"
                >
                  Change Plan
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={busy}
                  className="btn-secondary py-2 px-3 text-rose-600 dark:text-rose-400"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>

            {/* Billing KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
                <div className="text-[11px] font-semibold text-zinc-500">Monthly Cost</div>
                <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{money(data.kpis.monthlyCost)}/mo</div>
                <div className="mt-1 text-[11px] text-emerald-600 font-medium">Active Enterprise Plan</div>
              </div>

              <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
                <div className="text-[11px] font-semibold text-zinc-500">Team Seats</div>
                <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{data.kpis.usedSeats} / {data.kpis.totalSeats}</div>
                <div className="mt-1 text-[11px] text-zinc-400 font-medium">{data.kpis.totalSeats - data.kpis.usedSeats} seats available</div>
              </div>

              <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
                <div className="text-[11px] font-semibold text-zinc-500">AI Credits Used</div>
                <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{data.kpis.aiCreditsUsed.toLocaleString()} / {data.kpis.aiCreditsLimit.toLocaleString()}</div>
                <div className="mt-1 text-[11px] text-zinc-400 font-medium">{Math.round((data.kpis.aiCreditsUsed / data.kpis.aiCreditsLimit) * 100)}% consumed</div>
              </div>

              <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
                <div className="text-[11px] font-semibold text-zinc-500">Payment Method</div>
                <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <CreditCard size={18} className="text-zinc-700 dark:text-zinc-300" />
                  <span>•••• 4242</span>
                </div>
                <div className="mt-1 text-[11px] text-emerald-600 font-medium">Default Visa card</div>
              </div>
            </div>

            {/* Quick Resource Limits Preview Grid */}
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Resource Allocation & Usage Limits</h3>
                <button onClick={() => setActiveTab("plan")} className="font-bold text-zinc-900 hover:underline flex items-center gap-1 dark:text-zinc-100">
                  View Detailed Limits <ChevronRight size={13} />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.usage.slice(0, 6).map((item) => (
                  <div key={item.key} className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 space-y-2 dark:border-zinc-800/80 dark:bg-zinc-900/60">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{item.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.status === "LIMIT_REACHED" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" :
                        item.status === "WARNING" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                        "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}>
                        {item.used} / {item.limit}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.percentage >= 90 ? "bg-rose-500" : item.percentage >= 75 ? "bg-amber-500" : "bg-zinc-900 dark:bg-zinc-100"
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CURRENT PLAN & LIMITS */}
        {activeTab === "plan" && data && (
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Subscription</div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{data.subscription?.plan.name}</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">{data.subscription?.plan.description || "Full enterprise operational tier."}</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{money(data.subscription?.plan.monthlyPrice || 199)}/mo</div>
                  <span className="text-[11px] text-zinc-400">Renews on {data.kpis.nextBillingDate}</span>
                </div>
              </div>

              {/* Comprehensive Usage Meters Table */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Live Resource Consumption vs Limits</h3>
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden dark:divide-zinc-800 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  {data.usage.map((item) => (
                    <div key={item.key} className="p-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-[200px]">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.name}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{item.remaining} {item.unit} remaining</div>
                      </div>

                      <div className="flex-1 min-w-[220px] space-y-1.5">
                        <div className="flex justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                          <span>{item.used} {item.unit} used</span>
                          <span>{item.percentage}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.percentage >= 90 ? "bg-rose-500" : item.percentage >= 75 ? "bg-amber-500" : "bg-zinc-900 dark:bg-zinc-100"
                            }`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="min-w-[120px] text-right">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          item.status === "LIMIT_REACHED" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" :
                          item.status === "WARNING" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        }`}>
                          {item.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PRICING & PLANS */}
        {activeTab === "pricing" && data && (
          <div className="space-y-6">
            {/* Interval Selector Toggle */}
            <div className="flex justify-center">
              <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 text-xs shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                <button
                  onClick={() => setBillingInterval("monthly")}
                  className={cn(
                    "rounded-lg px-4 py-2 font-bold transition",
                    billingInterval === "monthly"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                  )}
                >
                  Monthly Billing
                </button>
                <button
                  onClick={() => setBillingInterval("yearly")}
                  className={cn(
                    "rounded-lg px-4 py-2 font-bold transition flex items-center gap-1.5",
                    billingInterval === "yearly"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                  )}
                >
                  <span>Annual Billing</span>
                  <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white">Save 20%</span>
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {data.plans.map((plan) => {
                const isCurrent = plan.isCurrent;
                const price = billingInterval === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "flex flex-col justify-between rounded-xl border p-5 shadow-2xs transition-all dark:bg-zinc-950/60 relative",
                      isCurrent
                        ? "border-zinc-900 bg-zinc-50/80 ring-2 ring-zinc-900 dark:border-zinc-100 dark:bg-zinc-900/60 dark:ring-zinc-100"
                        : "border-zinc-200/90 bg-white dark:border-zinc-800"
                    )}
                  >
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider dark:bg-zinc-100 dark:text-zinc-900">
                        Current Plan
                      </div>
                    )}

                    <div>
                      <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{plan.name}</div>
                      <p className="mt-1 text-[11px] text-zinc-500 line-clamp-2">{plan.description}</p>

                      <div className="mt-4">
                        <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">{money(price)}</span>
                        <span className="text-xs text-zinc-400">/{billingInterval === "monthly" ? "mo" : "yr"}</span>
                      </div>

                      <div className="mt-5 space-y-2 border-t border-zinc-100 pt-4 text-xs dark:border-zinc-800">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 text-[11px] uppercase tracking-wider">Includes:</div>
                        {plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-300">
                            <Check size={13} className="text-zinc-900 dark:text-zinc-100 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={() => setSelectedPlanToUpgrade(plan)}
                        disabled={busy || isCurrent}
                        className={cn(
                          "w-full py-2 text-xs font-semibold rounded-lg shadow-2xs transition",
                          isCurrent
                            ? "border border-zinc-200 bg-zinc-100 text-zinc-400 cursor-default dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-500"
                            : "btn-primary"
                        )}
                      >
                        {isCurrent ? "Active Tier" : `Switch to ${plan.name}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: INVOICES */}
        {activeTab === "invoices" && data && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
              <div className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Invoices & Billing Receipts</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Historical statements and proof of payment.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/70 font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
                      <th className="p-3.5 pl-5">Invoice #</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 pr-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {data.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition">
                        <td className="p-3.5 pl-5 font-bold text-zinc-900 dark:text-zinc-100">{inv.invoiceNumber}</td>
                        <td className="p-3.5 text-zinc-500">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                        <td className="p-3.5 font-semibold text-zinc-800 dark:text-zinc-200">{money(inv.amount)} {inv.currency}</td>
                        <td className="p-3.5">
                          <StatusBadge status={inv.status === "PAID" ? "Active" : "Draft"} />
                        </td>
                        <td className="p-3.5 pr-5 text-right space-x-2">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="btn-secondary py-1 px-2 text-[11px]"
                          >
                            View Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PAYMENT METHODS */}
        {activeTab === "payment-methods" && data && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Payment Methods</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Manage credit cards and payment sources linked to your workspace subscription.</p>
                </div>
                <button onClick={() => setIsAddPaymentModalOpen(true)} className="btn-primary flex items-center gap-1">
                  <Plus size={13} /> Add Payment Method
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {data.paymentMethods.map((pm) => (
                  <div key={pm.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-3 dark:border-zinc-800 dark:bg-zinc-900 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                        <CreditCard size={18} />
                        <span>{pm.brand} ending in {pm.last4}</span>
                      </div>
                      {pm.isDefault && (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Default Card
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">
                      Expires {pm.expMonth}/{pm.expYear} · {pm.holderName || "Workspace Card"}
                    </div>
                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs dark:border-zinc-800">
                      {!pm.isDefault ? (
                        <button onClick={() => triggerToast("Set as default card.")} className="font-semibold text-zinc-900 hover:underline dark:text-zinc-100">
                          Set Default
                        </button>
                      ) : <span className="text-zinc-400 text-[11px]">Primary billing card</span>}
                      <button onClick={() => triggerToast("Payment method removed.")} className="text-rose-600 hover:underline">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: BILLING HISTORY */}
        {activeTab === "history" && data && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-100 pb-3 dark:border-zinc-800">Billing Event Log</h3>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.billingHistory.map((evt) => (
                  <div key={evt.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{evt.action}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">By {evt.actor} · {new Date(evt.timestamp).toLocaleString()}</div>
                    </div>
                    {evt.amount && (
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{money(evt.amount)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: CREDITS */}
        {activeTab === "credits" && data && (
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-zinc-900 dark:text-zinc-100" />
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">AI Generation Credits</h3>
                </div>
                <button onClick={() => triggerToast("Purchased 5,000 bonus credits.")} className="btn-secondary py-1.5 px-3">
                  + Buy Extra Credits
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="text-[11px] font-semibold text-zinc-500">Monthly Included</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{data.credits.included.toLocaleString()}</div>
                </div>

                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="text-[11px] font-semibold text-zinc-500">Consumed Credits</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{data.credits.consumed.toLocaleString()}</div>
                </div>

                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="text-[11px] font-semibold text-zinc-500">Remaining Balance</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{data.credits.remaining.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: BILLING SETTINGS */}
        {activeTab === "settings" && data && (
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 max-w-2xl space-y-4">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-100 pb-3 dark:border-zinc-800">Billing Contact & Tax Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Company Name</label>
                  <input
                    value={contactForm.companyName}
                    onChange={(e) => setContactForm({ ...contactForm, companyName: e.target.value })}
                    className="input-clean mt-1"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Billing Email</label>
                  <input
                    value={contactForm.billingEmail}
                    onChange={(e) => setContactForm({ ...contactForm, billingEmail: e.target.value })}
                    className="input-clean mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Tax / VAT ID</label>
                  <input
                    value={contactForm.taxId}
                    onChange={(e) => setContactForm({ ...contactForm, taxId: e.target.value })}
                    className="input-clean mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Billing Address</label>
                  <input
                    value={contactForm.address}
                    onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                    className="input-clean mt-1"
                  />
                </div>
                <div className="pt-2 flex justify-end">
                  <button onClick={() => triggerToast("Billing settings updated.")} className="btn-primary">
                    Save Billing Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PLAN UPGRADE CONFIRMATION DRAWER */}
        {selectedPlanToUpgrade && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-md bg-white p-6 shadow-2xl dark:bg-zinc-900 overflow-y-auto space-y-5 animate-in slide-in-from-right">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Confirm Plan Upgrade</h3>
                <button onClick={() => setSelectedPlanToUpgrade(null)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X size={16} />
                </button>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60 space-y-2">
                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{selectedPlanToUpgrade.name} Plan</div>
                <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                  {money(billingInterval === "monthly" ? selectedPlanToUpgrade.monthlyPrice : selectedPlanToUpgrade.yearlyPrice)}/{billingInterval === "monthly" ? "mo" : "yr"}
                </div>
                <p className="text-xs text-zinc-500">{selectedPlanToUpgrade.description}</p>
              </div>

              <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="font-bold text-zinc-900 dark:text-zinc-100">Plan Impact Summary:</div>
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span>Team Seats</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedPlanToUpgrade.maxMembers} seats</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span>Monthly AI Credits</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedPlanToUpgrade.monthlyAICredits.toLocaleString()} credits</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span>Client Workspaces</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedPlanToUpgrade.maxClients} clients</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button onClick={() => setSelectedPlanToUpgrade(null)} className="flex-1 btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => handlePlanChange(selectedPlanToUpgrade.slug)}
                  disabled={busy}
                  className="flex-1 btn-primary"
                >
                  {busy ? "Updating..." : "Confirm Upgrade"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* INVOICE RECEIPT DRAWER */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-md bg-white p-6 shadow-2xl dark:bg-zinc-900 overflow-y-auto space-y-5 animate-in slide-in-from-right">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Invoice Receipt Details</h3>
                <button onClick={() => setSelectedInvoice(null)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{selectedInvoice.invoiceNumber}</div>
                <div className="text-xs text-zinc-500">Billed to: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{contactForm.companyName}</span></div>
                <div className="text-xs text-zinc-500">Date: {new Date(selectedInvoice.invoiceDate).toLocaleDateString()}</div>
                <div className="text-xs text-zinc-500">Status: <span className="font-bold text-emerald-600">{selectedInvoice.status}</span></div>

                <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60 space-y-2">
                  <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100">
                    <span>Total Paid</span>
                    <span>{money(selectedInvoice.amount)} {selectedInvoice.currency}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                <button onClick={() => setSelectedInvoice(null)} className="btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD PAYMENT METHOD MODAL */}
        {isAddPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-md bg-white p-6 rounded-xl border border-zinc-200 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Add Credit Card</h3>
                <button onClick={() => setIsAddPaymentModalOpen(false)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Card Number</label>
                  <input placeholder="•••• •••• •••• 4242" className="input-clean mt-1 font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Expiry Date</label>
                    <input placeholder="MM / YY" className="input-clean mt-1 font-mono" />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">CVC</label>
                    <input placeholder="123" className="input-clean mt-1 font-mono" />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                <button onClick={() => setIsAddPaymentModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsAddPaymentModalOpen(false);
                    triggerToast("New card linked successfully.");
                  }}
                  className="btn-primary"
                >
                  Save Card
                </button>
              </div>
            </div>
          </div>
        )}
        <CustomDialog
          isOpen={dialogConfig.isOpen}
          title={dialogConfig.title}
          message={dialogConfig.message}
          type={dialogConfig.type}
          confirmText={dialogConfig.confirmText}
          cancelText={dialogConfig.cancelText}
          confirmTone={dialogConfig.confirmTone}
          onConfirm={dialogConfig.onConfirm}
          onClose={() => setDialogConfig((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    </AppShell>
  );
}
