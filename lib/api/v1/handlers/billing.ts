/** /api/v1/billing handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { logServerError } from "@/lib/errors";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, context, type V1Context } from "@/lib/api/v1/core";

export async function GET({ path, auth }: V1Context): Promise<Response | null> {
  if (path === "billing") {
    try {
      const { getPersistedBillingOverview } = await import("@/lib/billing-service");
      const data = await getPersistedBillingOverview(auth.session.workspaceId);
      return ok(data);
    } catch (cause) {
      console.error("Billing overview failed:", cause);
      return error(logServerError("billing", "Failed to load billing details.", cause), 500, "BILLING_LOAD_FAILED");
    }
  }
  if (path.startsWith("billing/invoices/")) {
    const invoiceId = path.split("/")[2];
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspaceId: auth.session.workspaceId },
      include: { workspace: { include: { owner: true } } }
    });
    if (!invoice) return error("Invoice not found.", 404);
    return ok(invoice);
  }
  return null;
}

export async function POST({ request, path, body }: V1Context): Promise<Response | null> {
  if (path === "billing/payu/create-payment" || path === "billing/razorpay/create-order") {
    const auth = await context("billing.manage");
    if (auth.error) return auth.error;
    const parsed = z.object({
      type: z.enum(["subscription", "credits"]),
      planSlug: z.string().optional(),
      interval: z.enum(["monthly", "yearly"]).default("monthly"),
      packId: z.string().optional()
    }).safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid payment parameters.");

    const { createPayUPaymentRequest, CREDIT_PACKS, convertUsdToInr, formatPriceForCurrency, USD_TO_INR_RATE, isPayUConfigured } = await import("@/lib/payu");
    if (process.env.NODE_ENV === "production" && !isPayUConfigured()) {
      return error("Online payments aren't available yet. Please contact support to change your plan.", 503, "PAYMENTS_NOT_CONFIGURED");
    }
    const { DEFAULT_PLANS } = await import("@/lib/billing-service");

    let amountUsd = 0;
    let productinfo = "MarketerOS Purchase";
    const udf1 = auth.session.workspaceId;
    const udf2 = auth.session.userId;
    const udf3 = parsed.data.type;
    let udf4 = "";
    let udf5 = "";

    if (parsed.data.type === "subscription") {
      const plan = DEFAULT_PLANS.find((p) => p.slug === parsed.data.planSlug) || DEFAULT_PLANS[1];
      amountUsd = parsed.data.interval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
      productinfo = `Subscription: ${plan.name} (${parsed.data.interval})`;
      udf4 = plan.slug;
      udf5 = parsed.data.interval;
    } else {
      const pack = CREDIT_PACKS.find((p) => p.id === parsed.data.packId) || CREDIT_PACKS[0];
      amountUsd = pack.price;
      productinfo = `Credits: ${pack.name}`;
      udf4 = pack.id;
    }

    const ws = await prisma.workspace.findUnique({
      where: { id: auth.session.workspaceId },
      include: { owner: true }
    });

    const currency = (ws?.currency || "USD").toUpperCase();
    const amountInr = convertUsdToInr(amountUsd);
    const formattedPrice = formatPriceForCurrency(amountUsd, currency);
    const itemDescription = currency === "INR"
      ? `${productinfo} - ${formattedPrice}`
      : `${productinfo} - ${formattedPrice} (₹${amountInr.toLocaleString("en-IN")} INR)`;

    const rawOrigin = process.env.APP_URL || request.headers.get("origin") || request.headers.get("referer") || "http://localhost:3000";
    const origin = new URL(rawOrigin).origin;
    const surl = `${origin}/api/billing/payu/callback`;
    const furl = `${origin}/api/billing/payu/callback`;

    try {
      const paymentPayload = await createPayUPaymentRequest({
        amount: amountInr,
        productInfo: itemDescription,
        firstName: auth.session.name || ws?.owner?.firstName || "Customer",
        email: auth.session.email || ws?.owner?.email || "billing@marketeros.com",
        phone: "9999999999",
        surl,
        furl,
        udf1,
        udf2,
        udf3,
        udf4,
        udf5
      });
      return ok({
        ...paymentPayload,
        amountUsd,
        amountInr,
        exchangeRate: USD_TO_INR_RATE,
        currencyUsd: "USD",
        currencyInr: "INR",
        merchantKey: paymentPayload.key,
        params: {
          key: paymentPayload.key,
          txnid: paymentPayload.txnid,
          amount: paymentPayload.amount,
          productinfo: paymentPayload.productinfo,
          firstname: paymentPayload.firstname,
          email: paymentPayload.email,
          phone: paymentPayload.phone,
          surl: paymentPayload.surl,
          furl: paymentPayload.furl,
          hash: paymentPayload.hash,
          udf1: paymentPayload.udf1,
          udf2: paymentPayload.udf2,
          udf3: paymentPayload.udf3,
          udf4: paymentPayload.udf4,
          udf5: paymentPayload.udf5
        },
        id: paymentPayload.txnid,
        amount: Math.round(Number(paymentPayload.amount) * 100),
        currency: "INR",
        receipt: paymentPayload.txnid
      });
    } catch (err) {
      return error(logServerError("billing", "Failed to create PayU payment request.", err), 500, "PAYMENT_CREATION_FAILED");
    }
  }
  if (path === "billing/payu/verify-payment" || path === "billing/razorpay/verify-payment") {
    const auth = await context("billing.manage");
    if (auth.error) return auth.error;
    const parsed = z.object({
      txnid: z.string().optional(),
      amount: z.union([z.string(), z.number()]).optional(),
      productinfo: z.string().optional(),
      firstname: z.string().optional(),
      email: z.string().optional(),
      status: z.string().optional(),
      hash: z.string().optional(),
      key: z.string().optional(),
      payuMoneyId: z.string().optional(),
      mihpayid: z.string().optional(),
      udf1: z.string().optional(),
      udf2: z.string().optional(),
      udf3: z.string().optional(),
      udf4: z.string().optional(),
      udf5: z.string().optional(),
      additionalCharges: z.string().optional(),
      // Backward compatibility fields
      orderId: z.string().optional(),
      paymentId: z.string().optional(),
      signature: z.string().optional(),
      type: z.enum(["subscription", "credits"]).optional(),
      planSlug: z.string().optional(),
      interval: z.enum(["monthly", "yearly"]).optional(),
      packId: z.string().optional()
    }).safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid verification payload.");

    const payload = parsed.data;
    const txnid = payload.txnid || payload.orderId;
    if (!txnid) return error("A PayU transaction ID is required.", 400, "INVALID_PAYMENT");
    // The purchase is only ever credited to the caller's own workspace.
    if ((payload.udf1 && payload.udf1 !== auth.session.workspaceId) || (payload.udf2 && payload.udf2 !== auth.session.userId)) {
      return error("This payment does not belong to your workspace.", 403, "PAYMENT_WORKSPACE_MISMATCH");
    }
    const amount = payload.amount !== undefined ? payload.amount : 0;
    const status = payload.status || "";
    const hash = payload.hash || payload.signature || "";

    const { verifyPayUResponseHash } = await import("@/lib/payu");
    const isValid = verifyPayUResponseHash({
      txnid,
      amount: String(amount),
      productinfo: payload.productinfo || "MarketerOS Purchase",
      firstname: payload.firstname || "Customer",
      email: payload.email || auth.session.email || "billing@marketeros.com",
      status,
      hash,
      udf1: payload.udf1,
      udf2: payload.udf2,
      udf3: payload.udf3,
      udf4: payload.udf4,
      udf5: payload.udf5,
      additionalCharges: payload.additionalCharges
    });

    if (!isValid || status !== "success") {
      return error("PayU payment verification failed. Invalid hash signature.", 400, "INVALID_SIGNATURE");
    }

    const type = (payload.udf3 as "subscription" | "credits") || payload.type || "subscription";
    const planSlug = payload.udf4 || payload.planSlug;
    const interval = (payload.udf5 as "monthly" | "yearly") || payload.interval || "monthly";
    const packId = payload.udf4 || payload.packId;
    const payuPaymentId = payload.mihpayid || payload.payuMoneyId || payload.paymentId || `payu_${Date.now()}`;

    try {
      const { processSuccessfulPayment } = await import("@/lib/billing-service");
      const result = await processSuccessfulPayment({
        workspaceId: auth.session.workspaceId,
        userId: auth.session.userId,
        type,
        planSlug,
        interval,
        packId,
        payuTxnId: txnid,
        payuPaymentId,
        payuStatus: status,
        razorpayOrderId: txnid,
        razorpayPaymentId: payuPaymentId,
        razorpaySignature: hash
      });

      return ok({ success: true, ...result, message: "PayU payment verified and processed successfully." });
    } catch (cause) {
      return error(logServerError("billing", "Payment processing failed.", cause), 500, "BILLING_PROCESSING_FAILED");
    }
  }
  if (path === "billing/settings") {
    const auth = await context("billing.manage");
    if (auth.error) return auth.error;
    const parsed = z.object({
      companyName: z.string().optional(),
      billingEmail: z.string().email().optional().or(z.literal("")),
      taxId: z.string().optional(),
      address: z.string().optional(),
      country: z.string().optional(),
      currency: z.string().optional()
    }).safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid billing settings payload.");

    const { updatePersistedBillingContact } = await import("@/lib/billing-service");
    try {
      const updated = await updatePersistedBillingContact(auth.session.workspaceId, auth.session.userId, parsed.data);
      return ok({ success: true, workspace: updated, message: "Billing settings updated successfully." });
    } catch (cause) {
      return error(logServerError("billing", "Failed to save billing settings.", cause), 500, "BILLING_SETTINGS_FAILED");
    }
  }
  if (path === "billing/checkout") {
    const auth = await context("billing.manage");
    if (auth.error) return auth.error;
    // This used to switch plans without any payment. Plans now change only through a verified PayU payment.
    return error("Plan changes require payment. Start checkout with billing/payu/create-payment.", 402, "PAYMENT_REQUIRED");
  }
  if (path === "billing/portal") {
    const auth = await context("billing.manage");
    if (auth.error) return auth.error;
    return ok({ portalUrl: "/billing" });
  }
  if (path === "billing/cancel") {
    const auth = await context("billing.manage");
    if (auth.error) return auth.error;
    try {
      const { cancelPersistedSubscription } = await import("@/lib/billing-service");
      await cancelPersistedSubscription(auth.session.workspaceId, auth.session.userId);
      return ok({ cancelAtPeriodEnd: true, message: "Subscription cancelled successfully." });
    } catch (cause) {
      return error(logServerError("billing", "Failed to cancel subscription.", cause), 500, "BILLING_CANCEL_FAILED");
    }
  }
  return null;
}
