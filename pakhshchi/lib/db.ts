import { PrismaClient } from "@prisma/client";

// یک نمونه PrismaClient برای کل پروسه؛ در dev از globalThis استفاده می‌کنیم تا
// hot-reload اتصال اضافه نسازد.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
