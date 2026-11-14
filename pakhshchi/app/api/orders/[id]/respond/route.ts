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
const ID_RE = /^[A-Za-z0-9_-]{10,40}$/;

/** پذیرش/رد درخواست توسط صاحب پیج. ورود و مالکیت پیج الزامی است. */
export async function POST(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await params;
    if (!ID_RE.test(id)) return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });

    const limited = hit(`order:respond:${user.id}:${clientIp(req)}`, 120, 60 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

    const body = await readJson(req, 4_096);
    if (!body) throw new HttpError(400, "درخواست نامعتبر است.");
    const action = body.action;
    if (action !== "accept" && action !== "decline") throw new HttpError(400, "عملیات نامعتبر است.");

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        hold: true,
        page: { select: { ownerId: true, title: true } },
        campaign: { select: { advertiserId: true } },
      },
    });
    if (!order) return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
    if (order.page.ownerId !== user.id) throw new HttpError(403, "این درخواست متعلق به پیج شما نیست.");

    const now = new Date();
    const step = nextStep({
      action,
      actor: "OWNER" as Actor,
      now,
      order: {
        status: order.status,
        publishType: order.publishType as PagePublishType,
        respondByAt: order.respondByAt,
        publishDeadlineAt: order.publishDeadlineAt,
        proofSubmittedAt: order.proofSubmittedAt,
      },
      hold: order.hold,
    });
    if (!step.ok) throw new HttpError(400, step.error);

    await commitOrderStep({
      orderId: order.id,
      expectedOrderStatus: order.status,
      holdId: order.hold?.id ?? null,
      expectedHoldStatus: order.hold?.status ?? null,
      step,
      now,
      extra: (tx) =>
        notify(
          tx,
          order.campaign.advertiserId,
          action === "accept" ? "درخواست تبلیغ پذیرفته شد" : "درخواست تبلیغ رد شد",
          action === "accept"
            ? "صاحب پیج درخواست شما را پذیرفت. اطلاعات تماس در صفحهٔ سفارش قابل مشاهده است."
            : "صاحب پیج درخواست شما را رد کرد و مبلغ بلوکه‌شده به موجودی کیف پول شما برگشت.",
        ),
    });

    return NextResponse.json({
      message:
        action === "accept"
          ? "درخواست پذیرفته شد؛ اطلاعات تماس آشکار شد و مهلت انتشار شروع شد."
          : "درخواست رد شد و مبلغ بلوکه‌شده به کیف پول تبلیغ‌دهنده برگشت.",
      status: step.orderStatus,
    });
  });
}
