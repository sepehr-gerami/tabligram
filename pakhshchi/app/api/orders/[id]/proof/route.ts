import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { assertSameOrigin, clientIp, readJson, tooManyRequests, withErrors } from "@/lib/api";
import { hit } from "@/lib/rate-limit";
import { nextStep, type Actor } from "@/lib/money-rules";
import { commitOrderStep, notify } from "@/lib/order-transition";
import { isSafeImageUrl } from "@/lib/image-rules";
import { isHttpUrl } from "@/lib/utils";
import type { PagePublishType } from "@/lib/page-rules";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };
const MAX_CAPTION = 300;

/** ثبت مدرک انتشار (لینک پست + اسکرین‌شات آمار) توسط صاحب پیج. */
export async function POST(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await params;

    const limited = hit(`order:proof:${user.id}:${clientIp(req)}`, 60, 60 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

    const body = await readJson(req, 8_192);
    if (!body) throw new HttpError(400, "درخواست نامعتبر است.");

    const postLink = typeof body.postLink === "string" ? body.postLink.trim() : "";
    const statsImage = typeof body.statsImage === "string" ? body.statsImage.trim() : "";
    const caption = typeof body.caption === "string" ? body.caption.trim() : "";

    if (!postLink || postLink.length > 500 || !isHttpUrl(postLink)) {
      return NextResponse.json({ error: "لینک پست منتشرشده را کامل و با https وارد کنید.", fields: { postLink: "لینک معتبر نیست." } }, { status: 400 });
    }
    if (!statsImage || !isSafeImageUrl(statsImage)) {
      return NextResponse.json({ error: "تصویر آمار انتشار را آپلود کنید.", fields: { statsImage: "تصویر معتبر نیست." } }, { status: 400 });
    }
    if (caption.length > MAX_CAPTION) {
      return NextResponse.json({ error: `توضیح حداکثر ${MAX_CAPTION} حرف باشد.`, fields: { caption: "توضیح طولانی است." } }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        hold: true,
        page: { select: { ownerId: true } },
        campaign: { select: { advertiserId: true } },
      },
    });
    if (!order) return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
    if (order.page.ownerId !== user.id) throw new HttpError(403, "این سفارش متعلق به پیج شما نیست.");

    const now = new Date();
    const step = nextStep({
      action: "submit_proof",
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
      proof: { hasPostLink: postLink.length > 0, hasStatsScreenshot: statsImage.length > 0 },
    });
    if (!step.ok) throw new HttpError(400, step.error);

    await commitOrderStep({
      orderId: order.id,
      expectedOrderStatus: order.status,
      holdId: order.hold?.id ?? null,
      expectedHoldStatus: order.hold?.status ?? null,
      step,
      now,
      extra: async (tx) => {
        await tx.orderProof.deleteMany({ where: { orderId: order.id } });
        await tx.orderProof.createMany({
          data: [
            { orderId: order.id, kind: "POST_LINK", proofUrl: postLink, caption: caption || null },
            { orderId: order.id, kind: "STATS_SCREENSHOT", proofUrl: statsImage, caption: caption || null },
          ],
        });
        await notify(
          tx,
          order.campaign.advertiserId,
          "مدرک انتشار ثبت شد",
          "صاحب پیج مدرک انتشار را فرستاد. لطفاً انتشار را بررسی و تأیید کنید.",
        );
      },
    });

    return NextResponse.json({ message: "مدرک ثبت شد و برای تبلیغ‌دهنده ارسال گردید.", status: step.orderStatus });
  });
}
