import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { assertSameOrigin, clientIp, readJson, tooManyRequests, withErrors } from "@/lib/api";
import { hit } from "@/lib/rate-limit";
import { nextStep, type Actor } from "@/lib/money-rules";
import { commitOrderStep, notify } from "@/lib/order-transition";
import type { PagePublishType } from "@/lib/page-rules";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** تأیید نشر توسط تبلیغ‌دهنده؛ بلوکه به «نوبت پرداخت» می‌رود (هنوز پرداخت نشده). */
export async function POST(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await params;

    const limited = hit(`order:confirm:${user.id}`, 120, 60 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        hold: true,
        campaign: { select: { advertiserId: true } },
        page: { select: { ownerId: true } },
      },
    });
    if (!order) return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
    if (order.campaign.advertiserId !== user.id) throw new HttpError(403, "این سفارش متعلق به شما نیست.");

    const ownerCompletedOrders = await prisma.order.count({
      where: { pageId: order.pageId, status: "PAID_FULL" },
    });

    const now = new Date();
    const step = nextStep({
      action: "confirm",
      actor: "ADVERTISER" as Actor,
      now,
      order: {
        status: order.status,
        publishType: order.publishType as PagePublishType,
        respondByAt: order.respondByAt,
        publishDeadlineAt: order.publishDeadlineAt,
        proofSubmittedAt: order.proofSubmittedAt,
      },
      hold: order.hold,
      ownerCompletedOrders,
    });
    if (!step.ok) throw new HttpError(400, step.error);

    await commitOrderStep({
      orderId: order.id,
      expectedOrderStatus: order.status,
      holdId: order.hold?.id ?? null,
      expectedHoldStatus: order.hold?.status ?? null,
      step,
      now,
      orderData: { advertiserConfirmedAt: now },
      extra: (tx) =>
        notify(
          tx,
          order.page.ownerId,
          "نشر تبلیغ تأیید شد",
          "تبلیغ‌دهنده نشر را تأیید کرد. مبلغ خالص شما پس از پایان مهلت قانونی قابل پرداخت می‌شود.",
        ),
    });

    return NextResponse.json({
      message: "تأیید شد. مبلغ پس از پایان مهلت قانونی به صاحب پیج پرداخت می‌شود.",
      status: step.orderStatus,
    });
  });
}
