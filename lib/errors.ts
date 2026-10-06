import { Prisma } from "@prisma/client";

// Errors that describe internals (database, runtime bugs, network plumbing) rather than something the user did.
const RUNTIME_ERRORS = new Set(["TypeError", "ReferenceError", "SyntaxError", "RangeError", "EvalError", "URIError"]);

export function isInternalError(error: unknown) {
  if (!(error instanceof Error)) return true;
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) return true;
  if (RUNTIME_ERRORS.has(error.name)) return true;
  const code = (error as unknown as { code?: unknown }).code;
  if (typeof code === "string" && /^E[A-Z]+$/.test(code)) return true; // ECONNREFUSED etc.
  return false;
}

/**
 * Message for a 4xx response: our own thrown errors (business rules) pass through, internals don't.
 * Internals are logged so they still reach the server logs and Sentry.
 */
export function publicErrorMessage(error: unknown, fallback: string, context = "api") {
  if (isInternalError(error)) {
    console.error(`[${context}] ${fallback}`, error);
    return fallback;
  }
  return (error as Error).message;
}

/** For 5xx responses: always a generic message for the user, full detail in the logs. */
export function logServerError(context: string, message: string, error: unknown) {
  console.error(`[${context}] ${message}`, error);
  return message;
}
