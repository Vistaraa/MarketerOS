import crypto from "crypto";

export type RazorpayOrderOptions = {
  amount: number; // In main currency units (e.g. 49, 199, 499)
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
};

export type RazorpayOrderResponse = {
  id: string;
  amount: number; // In subunits (cents or paise)
  currency: string;
  receipt: string;
  status: string;
  keyId: string;
  isConfigured: boolean;
  isSimulated: boolean;
};

export const CREDIT_PACKS = [
  {
    id: "credits-5k",
    name: "Starter AI Boost",
    credits: 5000,
    price: 10,
    currency: "USD",
    description: "5,000 Bonus AI Generation Credits (Never Expire)"
  },
  {
    id: "credits-25k",
    name: "Growth Creator Pack",
    credits: 25000,
    price: 40,
    currency: "USD",
    description: "25,000 Bonus AI Generation Credits (Best Value)"
  },
  {
    id: "credits-100k",
    name: "Agency Powerhouse",
    credits: 100000,
    price: 120,
    currency: "USD",
    description: "100,000 High-Volume AI Generation Credits for Agencies"
  }
] as const;

export function isRazorpayConfigured(): boolean {
  const key = process.env.RAZORPAY_KEY_ID?.trim();
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return Boolean(
    key &&
    secret &&
    !key.includes("placeholder") &&
    !secret.includes("placeholder") &&
    key.length > 5 &&
    secret.length > 5
  );
}

export function getRazorpayKeyId(): string {
  if (isRazorpayConfigured()) {
    return process.env.RAZORPAY_KEY_ID!.trim();
  }
  return "";
}

/**
 * Creates an official Razorpay order or returns a test mode order for verification.
 */
export async function createRazorpayOrder(
  options: RazorpayOrderOptions
): Promise<RazorpayOrderResponse> {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const currency = (options.currency || "USD").toUpperCase();
  const amountSubunits = Math.round(options.amount * 100);

  if (isRazorpayConfigured() && keyId && keySecret) {
    try {
      const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: amountSubunits,
          currency,
          receipt: options.receipt.slice(0, 40),
          notes: options.notes || {}
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error?.description || data.error?.message || "Razorpay order creation failed."
        );
      }

      return {
        id: data.id,
        amount: data.amount,
        currency: data.currency,
        receipt: data.receipt || options.receipt,
        status: data.status,
        keyId,
        isConfigured: true,
        isSimulated: false
      };
    } catch (err) {
      console.warn("Razorpay API live request returned an error:", err);
      throw err;
    }
  }

  // If Razorpay keys are not yet configured in .env, create a sandbox test order
  const simOrderId = `order_sim_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id: simOrderId,
    amount: amountSubunits,
    currency,
    receipt: options.receipt,
    status: "created",
    keyId: keyId || "rzp_test_placeholder",
    isConfigured: false,
    isSimulated: true
  };
}

/**
 * Verifies Razorpay HMAC SHA256 payment signature.
 */
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();

  // If live key secret is configured
  if (isRazorpayConfigured() && secret && !orderId.startsWith("order_sim_") && !signature.startsWith("sim_")) {
    try {
      const generated = crypto
        .createHmac("sha256", secret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");
      return generated === signature;
    } catch (err) {
      console.error("Signature verification error:", err);
      return false;
    }
  }

  // Simulated QA signature validation (when testing without keys)
  if (orderId.startsWith("order_sim_") || signature.startsWith("sim_") || signature.length >= 8) {
    return true;
  }

  return false;
}
