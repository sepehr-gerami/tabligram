import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { walletSummary } from "@/lib/wallet";

export const runtime = "nodejs";

/** کیف پول من: موجودی آزاد، بلوکه‌ها، واریزهای در انتظار و آخرین تراکنش‌ها. */
export async function GET() {
  return withErrors(async () => {
    const user = await requireUser();
    const [summary, deposits, holds] = await Promise.all([
      walletSummary(user.id),
      prisma.deposit.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, amount: true, reference: true, status: true, rejectReason: true, createdAt: true, reviewedAt: true },
      }),
      prisma.hold.findMany({
        where: { advertiserId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true, amount: true, commission: true, publisherAmount: true, status: true, createdAt: true, payoutDueAt: true,
          order: {
            select: {
              id: true,
              publishType: true,
              campaign: { select: { title: true, orderNumber: true } },
              page: { select: { title: true, handle: true } },
            },
          },
        },
      }),
    ]);
    return NextResponse.json({ summary, deposits, holds }, { headers: { "Cache-Control": "no-store" } });
  });
}
