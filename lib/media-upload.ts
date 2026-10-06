import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { ALLOWED_MEDIA_TYPES } from "@/lib/media-validation";

/**
 * Signed "upload ticket" for direct-to-storage uploads. The browser gets it with the presigned URL and returns
 * it to /media/complete; the server only registers an object it issued a ticket for, for the same workspace,
 * with the declared type and size. No database state is needed for uploads in progress.
 */
export type UploadTicket = {
  workspaceId: string;
  userId: string;
  key: string;
  name: string;
  mimeType: string;
  size: number;
  folder: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  exp: number;
};

const TICKET_TTL_MS = 15 * 60 * 1000;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not configured.");
  return value;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(`media-upload:${payload}`).digest("base64url");

export function newStorageKey(workspaceId: string, mimeType: string) {
  return `${workspaceId}/${randomBytes(16).toString("hex")}.${ALLOWED_MEDIA_TYPES[mimeType]}`;
}

export function createUploadTicket(ticket: Omit<UploadTicket, "exp">) {
  const payload = Buffer.from(JSON.stringify({ ...ticket, exp: Date.now() + TICKET_TTL_MS })).toString("base64url");
  return { token: `${payload}.${sign(payload)}`, expiresAt: new Date(Date.now() + TICKET_TTL_MS) };
}

export function readUploadTicket(token: string): UploadTicket | null {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const ticket = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as UploadTicket;
    return ticket.exp > Date.now() ? ticket : null;
  } catch {
    return null;
  }
}
