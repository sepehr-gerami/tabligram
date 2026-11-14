// خواندن موجودی و بلوکه‌ها. همهٔ محاسبه‌ها با قوانین خالص lib/money-rules انجام می‌شود.
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { availableBalance } from "@/lib/money-rules";

type Db = PrismaClient | Prisma.TransactionClient;

export interface WalletSummary {
  /** جمع واریزهای تأییدشده */
  deposited: number;
  /** جمع بلوکه‌های غیربرگشتی (شامل پرداخت‌شده) */
  committed: number;
  /** موجودی آزاد قابل استفاده */
  available: number;
  /** واریزهای در انتظار تأیید */
  pendingDeposits: number;
}

/** موجودی کیف پول یک کاربر؛ همیشه از دادهٔ دیتابیس حساب می‌شود، نه از مقدار ذخیره‌شده. */
export async function walletSummary(userId: string, db: Db = prisma): Promise<WalletSummary> {
  const [deposits, holds, pending] = await Promise.all([
    db.deposit.findMany({ where: { userId, status: "VERIFIED" }, select: { amount: true } }),
    db.hold.findMany({ where: { advertiserId: userId }, select: { amount: true, status: true } }),
    db.deposit.aggregate({ where: { userId, status: "PENDING" }, _sum: { amount: true } }),
  ]);
  const deposited = deposits.reduce((s, d) => s + d.amount, 0);
  const available = availableBalance(deposits.map((d) => d.amount), holds);
  return {
    deposited,
    committed: deposited - available,
    available,
    pendingDeposits: pending._sum.amount ?? 0,
  };
}

/** جمع بلوکه‌های فعال یک کمپین (همه به‌جز REFUNDED). */
export async function campaignBlockedAmount(campaignId: string, db: Db = prisma): Promise<number> {
  const rows = await db.hold.findMany({
    where: { order: { campaignId }, status: { not: "REFUNDED" } },
    select: { amount: true },
  });
  return rows.reduce((s, h) => s + h.amount, 0);
}

/** موجودی خالص صاحب پیج (پس از کمیسیون) از سفارش‌های در جریان/پرداخت‌شده. */
export async function publisherEarnings(userId: string, db: Db = prisma) {
  const rows = await db.hold.findMany({
    where: { order: { page: { ownerId: userId } } },
    select: { status: true, amount: true, commission: true, publisherAmount: true },
  });
  const netOf = (h: { amount: number; commission: number; publisherAmount: number }) =>
    h.publisherAmount > 0 ? h.publisherAmount : h.amount - h.commission;
  const sum = (statuses: string[]) =>
    rows.filter((h) => statuses.includes(h.status)).reduce((s, h) => s + netOf(h), 0);
  return {
    gross: rows.filter((h) => h.status !== "REFUNDED").reduce((s, h) => s + h.amount, 0),
    commission: rows.filter((h) => h.status !== "REFUNDED").reduce((s, h) => s + h.commission, 0),
    /** در جریان (بلوکه/منتظر پرداخت) */
    pending: sum(["HELD", "PAYOUT_DUE", "DISPUTED"]),
    /** پرداخت‌شده */
    paid: sum(["PAID_OUT"]),
  };
}
