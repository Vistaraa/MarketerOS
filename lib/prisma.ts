import { Prisma, PrismaClient } from "@prisma/client";

export { Prisma };

const globalForPrisma = globalThis as unknown as { marketerPrisma?: PrismaClient };

export const prisma = globalForPrisma.marketerPrisma ?? new PrismaClient({ log: ["error"] });

globalForPrisma.marketerPrisma = prisma;
