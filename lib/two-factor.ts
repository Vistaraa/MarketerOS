import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { generateTotpSecret, matchTotp, otpauthUrl } from "@/lib/totp";

const RECOVERY_CODE_COUNT = 10;
/** How long after the password step the second factor may be entered. */
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const hashCode = (code: string) => createHash("sha256").update(code.toUpperCase().replace(/[^A-Z0-9]/g, "")).digest("hex");

function newRecoveryCodes() {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export async function getTwoFactorStatus(userId: string) {
  const row = await prisma.userTwoFactor.findUnique({ where: { userId } });
  return { enabled: Boolean(row?.enabledAt), enabledAt: row?.enabledAt?.toISOString() || null, recoveryCodesLeft: row?.enabledAt ? row.recoveryCodeHashes.length : 0 };
}

export async function isTwoFactorEnabled(userId: string) {
  return (await getTwoFactorStatus(userId)).enabled;
}

/** Starts enrollment with a fresh secret (replacing an unfinished one). Enabled only after a code is confirmed. */
export async function beginTwoFactorSetup(userId: string, accountEmail: string) {
  const existing = await prisma.userTwoFactor.findUnique({ where: { userId } });
  if (existing?.enabledAt) return { ok: false as const, status: 409, code: "TWO_FACTOR_ALREADY_ENABLED", message: "Two-factor authentication is already on." };
  const secret = generateTotpSecret();
  await prisma.userTwoFactor.upsert({
    where: { userId },
    update: { secretEncrypted: encryptSecret(secret), enabledAt: null, recoveryCodeHashes: [], lastUsedStep: null },
    create: { userId, secretEncrypted: encryptSecret(secret) }
  });
  const url = otpauthUrl(secret, accountEmail);
  return { ok: true as const, secret, otpauthUrl: url, qrCode: await QRCode.toDataURL(url, { margin: 1, width: 220 }) };
}

/** Confirms enrollment with a code from the app; returns recovery codes, shown to the user once. */
export async function enableTwoFactor(userId: string, code: string) {
  const row = await prisma.userTwoFactor.findUnique({ where: { userId } });
  if (!row) return { ok: false as const, status: 400, code: "TWO_FACTOR_NOT_STARTED", message: "Start the setup first." };
  if (row.enabledAt) return { ok: false as const, status: 409, code: "TWO_FACTOR_ALREADY_ENABLED", message: "Two-factor authentication is already on." };
  const step = matchTotp(decryptSecret(row.secretEncrypted), code);
  if (step === null) return { ok: false as const, status: 400, code: "INVALID_CODE", message: "That code didn't match. Check the time on your phone and try the newest code." };
  const recoveryCodes = newRecoveryCodes();
  await prisma.userTwoFactor.update({ where: { userId }, data: { enabledAt: new Date(), lastUsedStep: step, recoveryCodeHashes: recoveryCodes.map(hashCode) } });
  return { ok: true as const, recoveryCodes };
}

/**
 * Checks a second factor: a current authenticator code (each 30-second code works once) or an unused recovery
 * code (each works once). Returns how it was satisfied, or null.
 */
export async function verifySecondFactor(userId: string, input: string): Promise<"totp" | "recovery" | null> {
  const row = await prisma.userTwoFactor.findUnique({ where: { userId } });
  if (!row?.enabledAt || !input) return null;
  const step = matchTotp(decryptSecret(row.secretEncrypted), input);
  if (step !== null) {
    // Atomic: accepted only if no code at this step (or later) was used before.
    const claimed = await prisma.userTwoFactor.updateMany({ where: { userId, OR: [{ lastUsedStep: null }, { lastUsedStep: { lt: step } }] }, data: { lastUsedStep: step } });
    return claimed.count ? "totp" : null;
  }
  const hash = hashCode(input);
  if (!row.recoveryCodeHashes.includes(hash)) return null;
  const remaining = row.recoveryCodeHashes.filter((h) => h !== hash);
  const claimed = await prisma.userTwoFactor.updateMany({ where: { userId, recoveryCodeHashes: { has: hash } }, data: { recoveryCodeHashes: remaining } });
  return claimed.count ? "recovery" : null;
}

export async function disableTwoFactor(userId: string) {
  await prisma.userTwoFactor.deleteMany({ where: { userId } });
}

export async function regenerateRecoveryCodes(userId: string) {
  const recoveryCodes = newRecoveryCodes();
  await prisma.userTwoFactor.update({ where: { userId }, data: { recoveryCodeHashes: recoveryCodes.map(hashCode) } });
  return recoveryCodes;
}

/* ---- Login challenge: proof that the password step succeeded, carried to the second step. ---- */

function challengeSignature(payload: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be configured with at least 32 characters.");
  return createHmac("sha256", `2fa-challenge:${secret}`).update(payload).digest("base64url");
}

export function createLoginChallenge<T extends { userId: string }>(session: T) {
  const payload = Buffer.from(JSON.stringify({ s: session, exp: Date.now() + CHALLENGE_TTL_MS })).toString("base64url");
  return `${payload}.${challengeSignature(payload)}`;
}

export function readLoginChallenge<T extends { userId: string }>(token: string): T | null {
  const [payload, signature] = (token || "").split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(challengeSignature(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof data.exp === "number" && data.exp > Date.now() && data.s?.userId ? (data.s as T) : null;
  } catch {
    return null;
  }
}
