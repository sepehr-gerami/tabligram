import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { nextStep } from "@/lib/money-rules";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    const user = await requireAuth();
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { hold: true, campaign: true, page: true }
    });

    if (!order) return NextResponse.json({ error: "سفارش یافت نشد." }, { status: 404 });
    if (order.campaign.advertiserId !== user.id) return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });

    // گرفتن تعداد سفارش‌های موفق صاحب پیج (برای قانون تازه‌واردها)
    const ownerCompletedOrders = await prisma.order.count({
      where: { pageId: order.pageId, status: "PAID_FULL" }
    });

    const now = new Date();
    const stepResult = nextStep({
      action: "confirm",
      actor: "ADVERTISER",
      now,
      order: {
        status: order.status,
        publishType: order.publishType as "story" | "post" | "reels",
        respondByAt: order.respondByAt,
        publishDeadlineAt: order.publishDeadlineAt,
        proofSubmittedAt: order.proofSubmittedAt,
      },
      hold: order.hold,
      ownerCompletedOrders
    });

    if (!stepResult.ok) {
      return NextResponse.json({ error: stepResult.error }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. آپدیت سفارش به CONFIRMED
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: stepResult.orderStatus,
          advertiserConfirmedAt: now,
        }
      });

      // 2. آپدیت بلوکه به PAYOUT_DUE (یعنی پول هنوز بلوکه است اما نوبت پرداخت شده)
      if (order.hold) {
        await tx.hold.update({
          where: { id: order.hold.id },
          data: {
            status: stepResult.holdStatus,
            payoutDueAt: stepResult.payoutDueAt,
          }
        });
      }
    });

    return NextResponse.json({ message: "تایید شد. مبلغ پس از پایان زمان قانونی به صاحب پیج پرداخت می‌شود." });
  });
}