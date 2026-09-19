import { Prisma, PrismaClient } from "@prisma/client";

export { Prisma };

const globalForPrisma = globalThis as unknown as { marketerPrisma?: PrismaClient };

export const prisma = globalForPrisma.marketerPrisma ?? new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.marketerPrisma = prisma;
