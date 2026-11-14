import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, clientIp, readJson, tooManyRequests, withErrors } from "@/lib/api";
import { hit } from "@/lib/rate-limit";
import { createOrderRequest, isPublishType } from "@/lib/order-service";
import { HttpError } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * ارسال پیشنهاد به یک پیج مشخص از بازار (یا از صفحهٔ کمپین).
 * دقیقاً مانند توزیع خودکار: قوانین بودجه/تعرفه/مالکیت دوباره در سرور بررسی و مبلغ بلوکه می‌شود.
 */
export async function POST(req: Request) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    const limited = hit(`offer:create:${user.id}:${clientIp(req)}`, 60, 60 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

    const body = await readJson(req, 8_192);
    if (!body) throw new HttpError(400, "درخواست نامعتبر است.");

    const campaignId = typeof body.campaignId === "string" ? body.campaignId : "";
    const pageId = typeof body.pageId === "string" ? body.pageId : "";
    const publishType = body.publishType;
    if (!/^[A-Za-z0-9_-]{10,40}$/.test(campaignId) || !/^[A-Za-z0-9_-]{10,40}$/.test(pageId)) {
      throw new HttpError(400, "شناسه‌ها معتبر نیستند.");
    }
    if (!isPublishType(publishType)) throw new HttpError(400, "نوع انتشار معتبر نیست.");

    const result = await createOrderRequest({
      advertiserId: user.id,
      campaignId,
      pageId,
      publishType,
    });
    return NextResponse.json(
      {
        ...result,
        message: "پیشنهاد ارسال شد و مبلغ آن از موجودی شما بلوکه شد.",
      },
      { status: 201 },
    );
  });
}
