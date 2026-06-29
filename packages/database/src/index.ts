import { PrismaClient } from "@prisma/client";

// Dev rejimda ko'p ulanish (hot reload) oldini olish uchun global singleton
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
