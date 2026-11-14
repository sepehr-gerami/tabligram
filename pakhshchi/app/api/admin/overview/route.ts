import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrors } from "@/lib/api";

export const runtime = "nodejs";

/** آمار کلی پلتفرم برای داشبورد مدیر. */
export async function GET() {
  return withErrors(async () => {
    await requireAdmin();

    const [
      users, advertisers, publishers, pendingPages, approvedPages,
      campaigns, runningCampaigns, completedCampaigns,
      pendingDeposits, verifiedDeposits,
      requestedOrders, publishedOrders, completedOrders,
      heldAgg, dueAgg, paidAgg, refundedAgg, disputedCount,
      pendingPayoutProfiles,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.advertiserProfile.count(),
      prisma.publisherProfile.count(),
      prisma.instaPage.count({ where: { status: "PENDING" } }),
      prisma.instaPage.count({ where: { status: "APPROVED" } }),
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: "RUNNING" } }),
      prisma.campaign.count({ where: { status: "COMPLETED" } }),
      prisma.deposit.count({ where: { status: "PENDING" } }),
      prisma.deposit.aggregate({ where: { status: "VERIFIED" }, _sum: { amount: true } }),
      prisma.order.count({ where: { status: "REQUESTED" } }),
      prisma.order.count({ where: { status: "PUBLISHED" } }),
      prisma.order.count({ where: { status: "PAID_FULL" } }),
      prisma.hold.aggregate({ where: { status: "HELD" }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.hold.aggregate({ where: { status: "PAYOUT_DUE" }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.hold.aggregate({ where: { status: "PAID_OUT" }, _sum: { amount: true, commission: true, publisherAmount: true }, _count: { _all: true } }),
      prisma.hold.aggregate({ where: { status: "REFUNDED" }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.hold.count({ where: { status: "DISPUTED" } }),
      prisma.publisherProfile.count({ where: { payoutStatus: "PENDING" } }),
    ]);

    return NextResponse.json(
      {
        users,
        advertisers,
        publishers,
        pages: { pending: pendingPages, approved: approvedPages },
        campaigns: { total: campaigns, running: runningCampaigns, completed: completedCampaigns },
        deposits: { pendingCount: pendingDeposits, verifiedAmount: verifiedDeposits._sum.amount ?? 0 },
        orders: { requested: requestedOrders, published: publishedOrders, completed: completedOrders },
        holds: {
          held: { count: heldAgg._count._all, amount: heldAgg._sum.amount ?? 0 },
          payoutDue: { count: dueAgg._count._all, amount: dueAgg._sum.amount ?? 0 },
          paidOut: {
            count: paidAgg._count._all,
            amount: paidAgg._sum.amount ?? 0,
            commission: paidAgg._sum.commission ?? 0,
            publisherAmount: paidAgg._sum.publisherAmount ?? 0,
          },
          refunded: { count: refundedAgg._count._all, amount: refundedAgg._sum.amount ?? 0 },
          disputed: disputedCount,
        },
        pendingPayoutProfiles,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
