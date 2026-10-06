import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { isInternalError, publicErrorMessage } from "@/lib/errors";

describe("publicErrorMessage", () => {
  it("passes through our own business-rule errors", () => {
    expect(publicErrorMessage(new Error("Campaign budget must be positive."), "Failed")).toBe("Campaign budget must be positive.");
  });

  it("hides database and runtime internals behind the fallback, and logs them", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const prismaError = new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (`email`)", { code: "P2002", clientVersion: "5" });
    expect(publicErrorMessage(prismaError, "Could not save.")).toBe("Could not save.");
    expect(publicErrorMessage(new TypeError("Cannot read properties of undefined (reading 'id')"), "Could not save.")).toBe("Could not save.");
    expect(publicErrorMessage(Object.assign(new Error("connect ECONNREFUSED 10.0.0.5:5432"), { code: "ECONNREFUSED" }), "Could not save.")).toBe("Could not save.");
    expect(publicErrorMessage("not an error", "Could not save.")).toBe("Could not save.");
    expect(log).toHaveBeenCalledTimes(4);
    log.mockRestore();
  });

  it("classifies errors", () => {
    expect(isInternalError(new Error("Lead not found."))).toBe(false);
    expect(isInternalError(new RangeError("Invalid time value"))).toBe(true);
  });
});
