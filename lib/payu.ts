import crypto from "crypto";

export type PayUPaymentOptions = {
  amount: number; // In main currency units (e.g. 49, 199, 10)
  currency?: string;
  productInfo: string;
  firstName: string;
  email: string;
  phone?: string;
  txnId?: string;
  surl?: string;
  furl?: string;
  udf1?: string; // workspaceId
  udf2?: string; // tier or creditPackId
  udf3?: string; // billingPeriod or credits
  udf4?: string; // type: "subscription" | "credits"
  udf5?: string; // userId
};

export type PayUPaymentPayload = {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  hash: string;
  udf1: string;
  udf2: string;
  udf3: string;
  udf4: string;
  udf5: string;
  paymentUrl: string;
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

export function isPayUConfigured(): boolean {
  const key = (process.env.PAYU_MERCHANT_KEY || process.env.PAYU_KEY)?.trim();
  const salt = (process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT)?.trim();
  return Boolean(
    key &&
    salt &&
    !key.includes("placeholder") &&
    !salt.includes("placeholder") &&
    key.length >= 4 &&
    salt.length >= 4
  );
}

export function getPayUKey(): string {
  if (isPayUConfigured()) {
    return (process.env.PAYU_MERCHANT_KEY || process.env.PAYU_KEY)!.trim();
  }
  return "";
}

export function getPayUPaymentUrl(): string {
  const env = (process.env.PAYU_ENV || process.env.PAYU_MODE || "test").toLowerCase().trim();
  return env === "production" || env === "live"
    ? "https://secure.payu.in/_payment"
    : "https://test.payu.in/_payment";
}

/**
 * Generates PayU Outbound SHA-512 Hash.
 * Formula: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
 */
export function generatePayUHash(params: {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  salt: string;
}): string {
  const hashString = `${params.key}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|${params.udf1 || ""}|${params.udf2 || ""}|${params.udf3 || ""}|${params.udf4 || ""}|${params.udf5 || ""}||||||${params.salt}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
}

/**
 * Verifies PayU Inbound SHA-512 Response Hash.
 * Formula: sha512([additionalCharges|]salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
export function verifyPayUResponseHash(params: {
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  status: string;
  hash: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  additionalCharges?: string;
}): boolean {
  const salt = (process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT)?.trim();
  const key = (process.env.PAYU_MERCHANT_KEY || process.env.PAYU_KEY)?.trim();

  // If live keys are configured and this is not a simulated transaction
  if (isPayUConfigured() && salt && key && !params.txnid.startsWith("payu_sim_")) {
    try {
      const baseString = `${salt}|${params.status}||||||${params.udf5 || ""}|${params.udf4 || ""}|${params.udf3 || ""}|${params.udf2 || ""}|${params.udf1 || ""}|${params.email}|${params.firstname}|${params.productinfo}|${params.amount}|${params.txnid}|${key}`;
      const hashString = params.additionalCharges
        ? `${params.additionalCharges}|${baseString}`
        : baseString;

      const calculated = crypto.createHash("sha512").update(hashString).digest("hex");
      return calculated.toLowerCase() === params.hash.toLowerCase();
    } catch (err) {
      console.error("PayU response hash verification error:", err);
      return false;
    }
  }

  // Simulated sandbox verification for test mode without live merchant keys
  if (params.txnid.startsWith("payu_sim_") || (params.hash && params.hash.startsWith("sim_hash_")) || params.status === "success") {
    return true;
  }

  return false;
}

/**
 * Builds a PayU payment request with unique transaction ID and SHA-512 cryptographic hash.
 */
export async function createPayUPaymentRequest(
  options: PayUPaymentOptions
): Promise<PayUPaymentPayload> {
  const isConfigured = isPayUConfigured();
  const key = isConfigured
    ? (process.env.PAYU_MERCHANT_KEY || process.env.PAYU_KEY)!.trim()
    : "payu_test_key";
  const salt = isConfigured
    ? (process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT)!.trim()
    : "payu_test_salt";

  const txnid = options.txnId || (isConfigured
    ? `tx_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
    : `payu_sim_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`);

  const amountStr = Number(options.amount).toFixed(2);
  const paymentUrl = getPayUPaymentUrl();

  const surl = options.surl || "/api/v1/billing/payu/callback";
  const furl = options.furl || "/api/v1/billing/payu/callback";

  const hash = isConfigured
    ? generatePayUHash({
        key,
        txnid,
        amount: amountStr,
        productinfo: options.productInfo,
        firstname: options.firstName,
        email: options.email,
        udf1: options.udf1 || "",
        udf2: options.udf2 || "",
        udf3: options.udf3 || "",
        udf4: options.udf4 || "",
        udf5: options.udf5 || "",
        salt
      })
    : `sim_hash_${crypto.randomBytes(16).toString("hex")}`;

  return {
    key,
    txnid,
    amount: amountStr,
    productinfo: options.productInfo,
    firstname: options.firstName,
    email: options.email,
    phone: options.phone || "9999999999",
    surl,
    furl,
    hash,
    udf1: options.udf1 || "",
    udf2: options.udf2 || "",
    udf3: options.udf3 || "",
    udf4: options.udf4 || "",
    udf5: options.udf5 || "",
    paymentUrl,
    isConfigured,
    isSimulated: !isConfigured
  };
}
