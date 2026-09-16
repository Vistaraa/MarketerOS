"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  CreditCard,
  Check,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Printer,
  ChevronRight,
  Info,
  X,
  CheckCircle2,
  RefreshCw,
  Receipt,
  Lock,
  Smartphone,
  Landmark,
  Wallet,
  Key,
  Copy,
  ExternalLink
} from "lucide-react";
import { AppShell, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import { CustomDialog } from "@/components/ui/custom-dialog";
import type { ApiResponse } from "@/lib/api-contracts";
import type { BillingOverviewPayload } from "@/lib/billing-service";
import { CREDIT_PACKS } from "@/lib/razorpay";
import { cn, money } from "@/lib/utils";

type ActiveTab =
  | "overview"
  | "plan"
  | "pricing"
  | "invoices"
  | "payment-methods"
  | "history"
  | "credits"
  | "settings";

export function LiveBillingPage() {
  const [data, setData] = useState<BillingOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals & Drawers
  const [selectedPlanToUpgrade, setSelectedPlanToUpgrade] = useState<any | null>(null);
  const [isBuyCreditsModalOpen, setIsBuyCreditsModalOpen] = useState(false);
  const [selectedCreditPack, setSelectedCreditPack] = useState<typeof CREDIT_PACKS[number]>(CREDIT_PACKS[1]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [isSetupGuideOpen, setIsSetupGuideOpen] = useState(false);
  const [pendingSimulatedCheckout, setPendingSimulatedCheckout] = useState<any | null>(null);

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

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    companyName: "",
    billingEmail: "",
    taxId: "",
    address: "",
    country: "",
    currency: "USD"
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Load Razorpay Checkout Script
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!document.getElementById("razorpay-checkout-js")) {
      const script = document.createElement("script");
      script.id = "razorpay-checkout-js";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

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
        if (payload.subscription?.interval) {
          setBillingInterval(payload.subscription.interval.toLowerCase() as "monthly" | "yearly");
        }
        if (payload.billingContact) {
          setContactForm({
            companyName: payload.billingContact.companyName || "",
            billingEmail: payload.billingContact.billingEmail || "",
            taxId: payload.billingContact.taxId || "",
            address: payload.billingContact.address || "",
            country: payload.billingContact.country || "",
            currency: payload.billingContact.currency || "USD"
          });
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load billing data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBilling();
  }, []);

  // Save Billing Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/billing/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm)
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || "Failed to save billing settings.");
      triggerToast("Billing contact & tax settings successfully saved to database.");
      loadBilling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update billing settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Cancel Subscription
  const handleCancelSubscription = () => {
    setDialogConfig({
      isOpen: true,
      title: "Cancel Subscription",
      message:
        "Are you sure you want to cancel your subscription? Your workspace will remain active until the current period ends.",
      type: "confirm",
      confirmText: "Yes, Cancel at Period End",
      confirmTone: "danger",
      onConfirm: async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/v1/billing/cancel", { method: "POST" });
          const payload = await res.json();
          if (!res.ok) throw new Error(payload.error?.message || "Failed to cancel subscription.");
          triggerToast("Subscription cancellation scheduled for period end.");
          loadBilling();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to cancel subscription.");
        } finally {
          setBusy(false);
        }
      }
    });
  };

  // Verify and Finalize Payment
  const verifyAndFinalizePayment = async (verifyPayload: {
    orderId: string;
    paymentId: string;
    signature: string;
    type: "subscription" | "credits";
    planSlug?: string;
    interval?: "monthly" | "yearly";
    packId?: string;
  }) => {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/billing/razorpay/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyPayload)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || "Payment verification failed.");

      if (verifyPayload.type === "subscription") {
        triggerToast(`Payment successful! Plan upgraded to ${verifyPayload.planSlug?.toUpperCase()}.`);
        setSelectedPlanToUpgrade(null);
      } else {
        triggerToast("Payment successful! Extra AI Generation Credits added to workspace.");
        setIsBuyCreditsModalOpen(false);
      }
      setIsSetupGuideOpen(false);
      setPendingSimulatedCheckout(null);
      loadBilling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment verification failed.");
    } finally {
      setBusy(false);
    }
  };

  // Launch Razorpay Checkout
  const launchRazorpayCheckout = async (options: {
    type: "subscription" | "credits";
    planSlug?: string;
    interval?: "monthly" | "yearly";
    packId?: string;
    title: string;
    description: string;
    amount: number;
  }) => {
    setBusy(true);
    setError(null);
    try {
      // 1. Create order on server
      const orderRes = await fetch("/api/v1/billing/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: options.type,
          planSlug: options.planSlug,
          interval: options.interval || billingInterval,
          packId: options.packId
        })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error?.message || "Could not create Razorpay order.");

      const order = orderData.data;

      // 2. If keys are configured in .env and Razorpay checkout.js is available
      if (order.isConfigured && typeof window !== "undefined" && (window as any).Razorpay) {
        const rzpOptions = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "MarketerOS",
          description: options.description,
          order_id: order.id,
          prefill: {
            name: data?.billingContact.companyName || "",
            email: data?.billingContact.billingEmail || ""
          },
          theme: {
            color: "#18181b"
          },
          handler: async function (response: any) {
            await verifyAndFinalizePayment({
              orderId: response.razorpay_order_id || order.id,
              paymentId: response.razorpay_payment_id || `pay_${Date.now()}`,
              signature: response.razorpay_signature || `sig_${Date.now()}`,
              type: options.type,
              planSlug: options.planSlug,
              interval: options.interval || billingInterval,
              packId: options.packId
            });
          },
          modal: {
            ondismiss: function () {
              setBusy(false);
            }
          }
        };

        const rzp = new (window as any).Razorpay(rzpOptions);
        rzp.on("payment.failed", function (response: any) {
          setError(response.error?.description || "Payment failed or was cancelled.");
          setBusy(false);
        });
        rzp.open();
      } else {
        // If keys are not yet configured in .env, open the Setup Guide modal with simulated option
        setPendingSimulatedCheckout({
          orderId: order.id,
          type: options.type,
          planSlug: options.planSlug,
          interval: options.interval || billingInterval,
          packId: options.packId
        });
        setIsSetupGuideOpen(true);
        setBusy(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout initialization failed.");
      setBusy(false);
    }
  };

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    if (!data?.invoices) return [];
    if (!invoiceSearchQuery.trim()) return data.invoices;
    const q = invoiceSearchQuery.toLowerCase();
    return data.invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.razorpayPaymentId && inv.razorpayPaymentId.toLowerCase().includes(q))
    );
  }, [data?.invoices, invoiceSearchQuery]);

  if (loading) {
    return (
      <AppShell title="Billing">
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-xs text-zinc-500">
          <RefreshCw size={20} className="animate-spin text-zinc-400" />
          <span>Synchronizing live billing engine & subscriptions...</span>
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
          description="Manage workspace subscription tier, team quotas, live usage meters, itemized tax invoices, and payment methods."
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBuyCreditsModalOpen(true)}
                className="btn-secondary flex items-center gap-1.5"
              >
                <Sparkles size={13} className="text-amber-500" /> Buy AI Credits
              </button>
              <button
                onClick={() => setActiveTab("pricing")}
                className="btn-primary flex items-center gap-1.5"
              >
                <ShieldCheck size={13} /> Upgrade Plan
              </button>
            </div>
          }
        />

        {/* Toast Alert */}
        {toastMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200/80 overflow-x-auto dark:border-zinc-800 text-xs font-semibold">
          {[
            { id: "overview", label: "Overview" },
            { id: "plan", label: "Current Plan & Limits" },
            { id: "pricing", label: "Pricing & Plans" },
            { id: "invoices", label: `Invoices & Receipts (${data?.invoices.length || 0})` },
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
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                  <CreditCard size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {data.kpis.currentPlanName} Plan
                    </h3>
                    <StatusBadge
                      status={
                        data.subscription?.cancelAtPeriodEnd
                          ? "Pending"
                          : data.subscription?.status === "ACTIVE"
                          ? "Active"
                          : "Paused"
                      }
                    />
                    {data.subscription?.cancelAtPeriodEnd && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Cancelling at period end
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Billed {data.kpis.billingCycle.toLowerCase()} · Next renewal:{" "}
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {data.kpis.nextBillingDate}
                    </span>
                    {data.subscription?.razorpayPaymentId && (
                      <span className="ml-2 font-mono text-[10px] text-zinc-400">
                        (Ref: {data.subscription.razorpayPaymentId})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setActiveTab("pricing")} className="btn-primary py-2 px-4">
                  Change Plan
                </button>
                {!data.subscription?.cancelAtPeriodEnd && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={busy}
                    className="btn-secondary py-2 px-3 text-rose-600 dark:text-rose-400"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>

            {/* Billing KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
                <div className="text-[11px] font-semibold text-zinc-500">Monthly Cost</div>
                <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {money(data.kpis.monthlyCost)}
                  <span className="text-xs font-normal text-zinc-400">/mo</span>
                </div>
                <div className="mt-1 text-[11px] text-emerald-600 font-medium">
                  {data.kpis.billingCycle} billing active
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
                <div className="text-[11px] font-semibold text-zinc-500">Team Seats</div>
                <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {data.kpis.usedSeats} / {data.kpis.totalSeats}
                </div>
                <div className="mt-1 text-[11px] text-zinc-400 font-medium">
                  {Math.max(0, data.kpis.totalSeats - data.kpis.usedSeats)} seats available
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
                <div className="text-[11px] font-semibold text-zinc-500">Monthly AI Credits</div>
                <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {data.kpis.aiCreditsUsed.toLocaleString()} / {data.kpis.aiCreditsLimit.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-zinc-400 font-medium">
                  {Math.round((data.kpis.aiCreditsUsed / (data.kpis.aiCreditsLimit || 1)) * 100)}% consumed
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
                <div className="text-[11px] font-semibold text-zinc-500">Payment Channel</div>
                <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <CreditCard size={18} className="text-zinc-700 dark:text-zinc-300 shrink-0" />
                  <span className="text-sm font-bold">
                    {data.paymentMethods.length > 0 ? data.paymentMethods[0].brand : "Razorpay Checkout"}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-zinc-500 font-medium">
                  {data.paymentMethods.length > 0
                    ? `Ref ending in •••• ${data.paymentMethods[0].last4}`
                    : "No payment methods saved yet"}
                </div>
              </div>
            </div>

            {/* Resource Limits Preview */}
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                    Resource Allocation & Usage Limits
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Live telemetry vs current {data.kpis.currentPlanName} plan quotas.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("plan")}
                  className="font-bold text-zinc-900 hover:underline flex items-center gap-1 dark:text-zinc-100"
                >
                  View Detailed Limits <ChevronRight size={13} />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.usage.slice(0, 6).map((item) => (
                  <div
                    key={item.key}
                    className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 space-y-2 dark:border-zinc-800/80 dark:bg-zinc-900/60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{item.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.status === "LIMIT_REACHED"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                            : item.status === "WARNING"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                            : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {item.used} / {item.limit}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.percentage >= 90
                            ? "bg-rose-500"
                            : item.percentage >= 75
                            ? "bg-amber-500"
                            : "bg-zinc-900 dark:bg-zinc-100"
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
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Active Subscription Tier
                  </div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {data.subscription?.plan.name}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {data.subscription?.plan.description || "Operational agency tier."}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {money(data.subscription?.plan.monthlyPrice || 199)}/mo
                  </div>
                  <span className="text-[11px] text-zinc-400">Renews on {data.kpis.nextBillingDate}</span>
                </div>
              </div>

              {/* Comprehensive Resource Limits Table */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Live Resource Consumption vs Limits</h3>
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden dark:divide-zinc-800 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  {data.usage.map((item) => (
                    <div key={item.key} className="p-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-[200px]">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.name}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {item.remaining.toLocaleString()} {item.unit} remaining
                        </div>
                      </div>

                      <div className="flex-1 min-w-[220px] space-y-1.5">
                        <div className="flex justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                          <span>
                            {item.used.toLocaleString()} / {item.limit.toLocaleString()} {item.unit}
                          </span>
                          <span>{item.percentage}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.percentage >= 90
                                ? "bg-rose-500"
                                : item.percentage >= 75
                                ? "bg-amber-500"
                                : "bg-zinc-900 dark:bg-zinc-100"
                            }`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="min-w-[120px] text-right">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            item.status === "LIMIT_REACHED"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                              : item.status === "WARNING"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          }`}
                        >
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
            {/* Interval Toggle */}
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
                  <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white">
                    Save 20%
                  </span>
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
                        Current Tier
                      </div>
                    )}

                    <div>
                      <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{plan.name}</div>
                      <p className="mt-1 text-[11px] text-zinc-500 line-clamp-2">{plan.description}</p>

                      <div className="mt-4">
                        <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
                          {money(price)}
                        </span>
                        <span className="text-xs text-zinc-400">
                          /{billingInterval === "monthly" ? "mo" : "yr"}
                        </span>
                      </div>

                      <div className="mt-5 space-y-2 border-t border-zinc-100 pt-4 text-xs dark:border-zinc-800">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 text-[11px] uppercase tracking-wider">
                          Includes:
                        </div>
                        {plan.features.map((feat, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-300"
                          >
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
                          "w-full py-2.5 text-xs font-semibold rounded-lg shadow-2xs transition flex items-center justify-center gap-1.5",
                          isCurrent
                            ? "border border-zinc-200 bg-zinc-100 text-zinc-400 cursor-default dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-500"
                            : "btn-primary"
                        )}
                      >
                        {isCurrent ? (
                          "Active Plan"
                        ) : (
                          <>
                            <span>Switch to {plan.name}</span>
                            <ChevronRight size={13} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: INVOICES & RECEIPTS */}
        {activeTab === "invoices" && data && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 p-5 dark:border-zinc-800">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    Official Invoices & Tax Receipts
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Downloadable receipts for corporate tax accounting & GST compliance.
                  </p>
                </div>
                {data.invoices.length > 0 && (
                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Search invoice or payment ID..."
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      className="input-clean text-xs py-1.5"
                    />
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/70 font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
                      <th className="p-3.5 pl-5">Invoice #</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5">Payment Ref</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 pr-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition">
                        <td className="p-3.5 pl-5 font-bold text-zinc-900 dark:text-zinc-100">
                          {inv.invoiceNumber}
                        </td>
                        <td className="p-3.5 text-zinc-500">
                          {new Date(inv.invoiceDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </td>
                        <td className="p-3.5 font-semibold text-zinc-800 dark:text-zinc-200">
                          {money(inv.amount)} {inv.currency}
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-zinc-500">
                          {inv.razorpayPaymentId || "rzp_manual"}
                        </td>
                        <td className="p-3.5">
                          <StatusBadge status={inv.status === "PAID" ? "Active" : "Draft"} />
                        </td>
                        <td className="p-3.5 pr-5 text-right space-x-2">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="btn-secondary py-1 px-2.5 text-[11px] inline-flex items-center gap-1"
                          >
                            <Receipt size={12} /> View Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredInvoices.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-zinc-400">
                          No invoices found. When you upgrade a plan or purchase AI credits, your invoices will appear here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PAYMENT METHODS */}
        {activeTab === "payment-methods" && data && (
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-5">
              <div className="border-b border-zinc-100 pb-4 dark:border-zinc-800">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  Razorpay Payment Gateway & Channels
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  All workspace transactions are secured through Razorpay's PCI-DSS Level 1 compliant gateway.
                </p>
              </div>

              {/* Gateway Status Box */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-emerald-600" size={18} />
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      Razorpay Gateway Status
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        data.gateway.isConfigured
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {data.gateway.isConfigured ? "Connected (Live Test Mode)" : "Setup Guide Required"}
                    </span>
                  </div>
                  {!data.gateway.isConfigured && (
                    <button
                      onClick={() => setIsSetupGuideOpen(true)}
                      className="btn-secondary py-1 px-2.5 text-[11px] flex items-center gap-1 font-semibold"
                    >
                      <Key size={12} /> Configure API Keys
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 pt-2">
                  <div className="flex items-center gap-2.5 rounded-lg border border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                    <CreditCard size={18} className="text-zinc-700 dark:text-zinc-300" />
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">Credit / Debit Cards</div>
                      <div className="text-[10px] text-zinc-400">Visa, Mastercard, RuPay</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-lg border border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                    <Smartphone size={18} className="text-emerald-600" />
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">Instant UPI</div>
                      <div className="text-[10px] text-zinc-400">Google Pay, PhonePe, Paytm</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-lg border border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                    <Landmark size={18} className="text-sky-600" />
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">Netbanking</div>
                      <div className="text-[10px] text-zinc-400">50+ Supported Banks</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-lg border border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                    <Wallet size={18} className="text-amber-600" />
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">Digital Wallets</div>
                      <div className="text-[10px] text-zinc-400">Standard Wallets</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified Payment Methods on File */}
              <div className="space-y-3">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                  Active Payment Methods on File
                </h4>
                {data.paymentMethods.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.paymentMethods.map((pm) => (
                      <div
                        key={pm.id}
                        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-2 dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                            <CreditCard size={18} />
                            <span>{pm.brand}</span>
                          </div>
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Verified Gateway Token
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 font-mono">
                          Transaction Ref: •••• {pm.last4}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
                    No payment methods linked yet. When you complete your first plan upgrade or credits purchase via
                    Razorpay, your verified transaction token will be saved here automatically.
                  </div>
                )}
              </div>

              {/* PCI-DSS Security Guarantee */}
              <div className="rounded-xl border border-zinc-200/60 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/30 flex items-start gap-3">
                <Lock size={16} className="text-zinc-500 mt-0.5 shrink-0" />
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    PCI-DSS Level 1 Security & Tokenization
                  </div>
                  <p className="text-zinc-500">
                    MarketerOS does not store raw credit card numbers or CVVs on our servers. All card and UPI payments are
                    tokenized directly through Razorpay's certified vault in compliance with RBI regulations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: BILLING HISTORY */}
        {activeTab === "history" && data && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
              <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                    Billing Audit & Event Log
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Activity record of plan upgrades, credits purchases, and settings changes.
                  </p>
                </div>
                <button
                  onClick={loadBilling}
                  className="btn-secondary py-1 px-2.5 text-[11px] flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Refresh Log
                </button>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.billingHistory.map((evt) => (
                  <div key={evt.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
                        {evt.action}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        By {evt.actor} ·{" "}
                        {new Date(evt.timestamp).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short"
                        })}
                      </div>
                    </div>
                    {evt.amount && (
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{money(evt.amount)}</span>
                    )}
                  </div>
                ))}
                {data.billingHistory.length === 0 && (
                  <div className="py-8 text-center text-zinc-400">
                    No billing activity recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: AI CREDITS */}
        {activeTab === "credits" && data && (
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-amber-500" />
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                      AI Generation Credits Pool
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Fueling AI ad copy, visual automations, multi-channel insights, and report generation.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBuyCreditsModalOpen(true)}
                  className="btn-primary flex items-center gap-1.5"
                >
                  <Sparkles size={13} /> + Buy Extra Credits
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="text-[11px] font-semibold text-zinc-500">Plan Included (Monthly)</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                    {data.credits.included.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1">Resets each billing cycle</div>
                </div>

                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="text-[11px] font-semibold text-zinc-500">Purchased Bonus Credits</div>
                  <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">
                    {data.credits.purchased.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1">Never expires</div>
                </div>

                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="text-[11px] font-semibold text-zinc-500">Consumed Credits</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                    {data.credits.consumed.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1">1 credit per ~100 tokens</div>
                </div>

                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="text-[11px] font-semibold text-zinc-500">Remaining Available Balance</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {data.credits.remaining.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-1">Ready for generation</div>
                </div>
              </div>

              {/* AI Credits Consumption by Route & Feature */}
              <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                      AI Credits Consumption Log (By Feature & Route)
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Live audit of where AI credits were consumed across pages, features, and models.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {data.aiUsageHistory?.length || 0} Operations Recorded
                  </span>
                </div>

                {(!data.aiUsageHistory || data.aiUsageHistory.length === 0) ? (
                  <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-8 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50">
                    No AI credits consumed yet. Try running an AI Diagnostic on the{" "}
                    <a href="/ai-insights" className="text-indigo-600 underline dark:text-indigo-400">
                      AI Insights page
                    </a>{" "}
                    or generating copy in{" "}
                    <a href="/content-studio" className="text-indigo-600 underline dark:text-indigo-400">
                      Content Studio
                    </a>
                    .
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                        <tr>
                          <th className="px-4 py-3">Feature & Route</th>
                          <th className="px-4 py-3">Prompt / Task</th>
                          <th className="px-4 py-3">Model</th>
                          <th className="px-4 py-3">Tokens Total</th>
                          <th className="px-4 py-3">Credits Deducted</th>
                          <th className="px-4 py-3 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
                        {data.aiUsageHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50 transition">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                                  {item.feature}
                                </span>
                                <a
                                  href={item.route}
                                  className="font-mono text-[10px] text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline"
                                >
                                  {item.route}
                                </a>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200 max-w-[260px] truncate">
                              {item.promptSnippet}
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                              {item.model}
                            </td>
                            <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-300">
                              {item.tokensTotal.toLocaleString()} tokens
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-rose-600 dark:text-rose-400">
                                -{item.creditsUsed} {item.creditsUsed === 1 ? "credit" : "credits"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-400 text-[11px] whitespace-nowrap">
                              {item.timestamp}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: BILLING SETTINGS */}
        {activeTab === "settings" && data && (
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 max-w-2xl space-y-4">
              <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  Billing Contact & Corporate Tax Information
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  These details will be dynamically printed on all subsequent invoices and receipts.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300">
                    Legal Company / Business Name
                  </label>
                  <input
                    type="text"
                    required
                    value={contactForm.companyName}
                    onChange={(e) => setContactForm({ ...contactForm, companyName: e.target.value })}
                    className="input-clean mt-1"
                    placeholder="Enter legal business name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">
                      Billing Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={contactForm.billingEmail}
                      onChange={(e) => setContactForm({ ...contactForm, billingEmail: e.target.value })}
                      className="input-clean mt-1 font-mono"
                      placeholder="finance@yourcompany.com"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">
                      Tax ID / VAT / GSTIN
                    </label>
                    <input
                      type="text"
                      value={contactForm.taxId}
                      onChange={(e) => setContactForm({ ...contactForm, taxId: e.target.value })}
                      className="input-clean mt-1 font-mono uppercase"
                      placeholder="e.g. GSTIN27AAACW1234F1Z5 or VAT ID"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300">
                    Registered Billing Address
                  </label>
                  <input
                    type="text"
                    value={contactForm.address}
                    onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                    className="input-clean mt-1"
                    placeholder="Street address, Suite, City, Postal code"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">
                      Country / Jurisdiction
                    </label>
                    <input
                      type="text"
                      value={contactForm.country}
                      onChange={(e) => setContactForm({ ...contactForm, country: e.target.value })}
                      className="input-clean mt-1"
                      placeholder="e.g. India or United States"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">
                      Billing Currency
                    </label>
                    <select
                      value={contactForm.currency}
                      onChange={(e) => setContactForm({ ...contactForm, currency: e.target.value })}
                      className="input-clean mt-1 font-mono"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="btn-primary flex items-center gap-1.5"
                  >
                    {isSavingSettings ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save Billing Settings"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PLAN UPGRADE MODAL */}
        {selectedPlanToUpgrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-md bg-white p-6 rounded-xl border border-zinc-200 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-5 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Upgrade to {selectedPlanToUpgrade.name}
                </h3>
                <button
                  onClick={() => setSelectedPlanToUpgrade(null)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60 space-y-2">
                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
                  {selectedPlanToUpgrade.name} Tier
                </div>
                <div className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                  {money(
                    billingInterval === "monthly"
                      ? selectedPlanToUpgrade.monthlyPrice
                      : selectedPlanToUpgrade.yearlyPrice
                  )}
                  <span className="text-xs font-normal text-zinc-400">
                    /{billingInterval === "monthly" ? "mo" : "yr"}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{selectedPlanToUpgrade.description}</p>
              </div>

              <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="font-bold text-zinc-900 dark:text-zinc-100">Plan Quota Summary:</div>
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span>Team Seats</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedPlanToUpgrade.maxMembers} seats
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span>Monthly AI Generation Credits</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedPlanToUpgrade.monthlyAICredits.toLocaleString()} credits
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span>Client Workspaces</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedPlanToUpgrade.maxClients} clients
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => setSelectedPlanToUpgrade(null)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    launchRazorpayCheckout({
                      type: "subscription",
                      planSlug: selectedPlanToUpgrade.slug,
                      interval: billingInterval,
                      title: `Upgrade to ${selectedPlanToUpgrade.name}`,
                      description: `${selectedPlanToUpgrade.name} Subscription (${billingInterval})`,
                      amount:
                        billingInterval === "monthly"
                          ? selectedPlanToUpgrade.monthlyPrice
                          : selectedPlanToUpgrade.yearlyPrice
                    })
                  }
                  disabled={busy}
                  className="flex-1 btn-primary flex items-center justify-center gap-1.5"
                >
                  {busy ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard size={13} /> Pay with Razorpay
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BUY AI CREDITS MODAL */}
        {isBuyCreditsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-lg bg-white p-6 rounded-xl border border-zinc-200 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-5 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Purchase Extra AI Generation Credits
                  </h3>
                </div>
                <button
                  onClick={() => setIsBuyCreditsModalOpen(false)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-zinc-500">
                Select an AI credit pack. Bonus credits never expire and are added directly to your generative quota.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                {CREDIT_PACKS.map((pack) => {
                  const isSelected = selectedCreditPack.id === pack.id;
                  return (
                    <div
                      key={pack.id}
                      onClick={() => setSelectedCreditPack(pack)}
                      className={cn(
                        "cursor-pointer rounded-xl border p-4 text-center transition space-y-2",
                        isSelected
                          ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:ring-zinc-100"
                          : "border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/60"
                      )}
                    >
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{pack.name}</div>
                      <div className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
                        {pack.credits.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-zinc-400">credits</div>
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 pt-1">
                        ${pack.price}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/60 flex items-center justify-between">
                <span>Selected: <strong>{selectedCreditPack.name}</strong></span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  Total: ${selectedCreditPack.price}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button onClick={() => setIsBuyCreditsModalOpen(false)} className="flex-1 btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() =>
                    launchRazorpayCheckout({
                      type: "credits",
                      packId: selectedCreditPack.id,
                      title: `Buy ${selectedCreditPack.name}`,
                      description: `${selectedCreditPack.credits.toLocaleString()} Extra AI Credits`,
                      amount: selectedCreditPack.price
                    })
                  }
                  disabled={busy}
                  className="flex-1 btn-primary flex items-center justify-center gap-1.5"
                >
                  {busy ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard size={13} /> Pay ${selectedCreditPack.price} with Razorpay
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ITEMIZED INVOICE RECEIPT DRAWER */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-lg bg-white p-6 shadow-2xl dark:bg-zinc-900 overflow-y-auto space-y-6 animate-in slide-in-from-right">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Receipt size={18} className="text-zinc-700 dark:text-zinc-300" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Official Tax Receipt
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div id="printable-receipt" className="space-y-4">
                <div className="flex justify-between items-start border-b border-zinc-100 pb-4 dark:border-zinc-800">
                  <div>
                    <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                      {selectedInvoice.invoiceNumber}
                    </h2>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      Date:{" "}
                      {new Date(selectedInvoice.invoiceDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={selectedInvoice.status === "PAID" ? "Active" : "Draft"} />
                    <div className="font-mono text-[10px] text-zinc-400 mt-1">
                      {selectedInvoice.razorpayPaymentId || "PAY-REF-DIRECT"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider">
                      Billed To:
                    </div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                      {contactForm.companyName || data?.billingContact.companyName || "Workspace Account"}
                    </div>
                    {(contactForm.billingEmail || data?.billingContact.billingEmail) && (
                      <div className="text-zinc-500">
                        {contactForm.billingEmail || data?.billingContact.billingEmail}
                      </div>
                    )}
                    {(contactForm.address || data?.billingContact.address) && (
                      <div className="text-zinc-500">
                        {contactForm.address || data?.billingContact.address}
                      </div>
                    )}
                    {(contactForm.taxId || data?.billingContact.taxId) && (
                      <div className="font-mono text-zinc-600 dark:text-zinc-400 mt-1">
                        Tax / GSTIN: {contactForm.taxId || data?.billingContact.taxId}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider">
                      Provider:
                    </div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-1">MarketerOS Platform</div>
                    <div className="text-zinc-500">billing@marketeros.com</div>
                    <div className="text-zinc-500">
                      {data?.gateway.isConfigured ? "Razorpay Gateway (Production/Test)" : "Razorpay Test Sandbox"}
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="rounded-xl border border-zinc-200 overflow-hidden dark:border-zinc-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/60 font-semibold">
                        <th className="p-3 pl-4">Description</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 pr-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                        selectedInvoice.items.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-3 pl-4 font-medium text-zinc-800 dark:text-zinc-200">
                              {item.description}
                            </td>
                            <td className="p-3 text-center text-zinc-500">{item.quantity || 1}</td>
                            <td className="p-3 pr-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                              {money(item.amount || selectedInvoice.amount)} {selectedInvoice.currency}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="p-3 pl-4 font-medium text-zinc-800 dark:text-zinc-200">
                            Workspace Subscription Plan
                          </td>
                          <td className="p-3 text-center text-zinc-500">1</td>
                          <td className="p-3 pr-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                            {money(selectedInvoice.amount)} {selectedInvoice.currency}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60 space-y-2">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Subtotal</span>
                    <span>{money(selectedInvoice.amount)} {selectedInvoice.currency}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Taxes & GST</span>
                    <span>{selectedInvoice.currency === "INR" ? "₹0.00" : "$0.00"} Included</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-zinc-900 dark:text-zinc-100 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span>Total Amount Paid</span>
                    <span>{money(selectedInvoice.amount)} {selectedInvoice.currency}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <button
                  onClick={() => window.print()}
                  className="btn-secondary flex items-center gap-1.5"
                >
                  <Printer size={13} /> Print / Save PDF
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="btn-primary">
                  Close Receipt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RAZORPAY SETUP GUIDE MODAL */}
        {isSetupGuideOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-lg bg-white p-6 rounded-xl border border-zinc-200 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-5 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Key size={18} className="text-sky-600" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Razorpay Gateway Setup Guide
                  </h3>
                </div>
                <button
                  onClick={() => setIsSetupGuideOpen(false)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300">
                <p>
                  To enable the official Razorpay Checkout popup modal (with Cards, UPI, Netbanking, QR codes), add your
                  free test keys to your project's <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded dark:bg-zinc-800">.env</code> file:
                </p>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/80 space-y-2">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                    <span>How to get free test keys (1 Minute):</span>
                    <a
                      href="https://dashboard.razorpay.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-600 hover:underline inline-flex items-center gap-1 text-[11px]"
                    >
                      Razorpay Dashboard <ExternalLink size={11} />
                    </a>
                  </div>
                  <ol className="list-decimal pl-4 space-y-1 text-zinc-500">
                    <li>Log in to Razorpay Dashboard (free sign up, no KYC needed for test mode).</li>
                    <li>Toggle switch to <strong>Test Mode</strong> in the top header.</li>
                    <li>Go to <strong>Settings → API Keys → Generate Key</strong>.</li>
                    <li>Copy your <strong>Key ID</strong> and <strong>Key Secret</strong>.</li>
                  </ol>
                </div>

                <div className="space-y-1">
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Add to your <code className="font-mono">.env</code>:
                  </div>
                  <pre className="p-3 rounded-lg bg-zinc-900 text-zinc-100 font-mono text-[11px] overflow-x-auto select-all">
{`RAZORPAY_KEY_ID="rzp_test_YourKeyIdHere"
RAZORPAY_KEY_SECRET="YourSecretKeyHere"`}
                  </pre>
                  <p className="text-[10px] text-zinc-400">
                    After updating <code className="font-mono">.env</code>, restart your server with <code className="font-mono">npm run dev</code>.
                  </p>
                </div>
              </div>

              {pendingSimulatedCheckout ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3.5 space-y-2 dark:border-sky-900 dark:bg-sky-950/40">
                  <div className="font-bold text-sky-900 dark:text-sky-200 text-xs">
                    Test Mode Simulator Option:
                  </div>
                  <p className="text-xs text-sky-800 dark:text-sky-300">
                    Don't have keys right now? You can test the checkout flow, subscription update, and invoice generation
                    using the built-in test sandbox:
                  </p>
                  <button
                    onClick={() =>
                      verifyAndFinalizePayment({
                        orderId: pendingSimulatedCheckout.orderId,
                        paymentId: `pay_test_${Math.random().toString(36).substring(2, 9)}`,
                        signature: `sim_sig_${pendingSimulatedCheckout.orderId}`,
                        type: pendingSimulatedCheckout.type,
                        planSlug: pendingSimulatedCheckout.planSlug,
                        interval: pendingSimulatedCheckout.interval,
                        packId: pendingSimulatedCheckout.packId
                      })
                    }
                    disabled={busy}
                    className="w-full btn-primary py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    {busy ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                    Complete Test Checkout in Sandbox
                  </button>
                </div>
              ) : (
                <div className="pt-2 flex justify-end">
                  <button onClick={() => setIsSetupGuideOpen(false)} className="btn-secondary">
                    Got it
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REUSABLE CONFIRMATION DIALOG */}
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
