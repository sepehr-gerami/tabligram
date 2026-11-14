import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, clientIp, readJson, tooManyRequests, withErrors } from "@/lib/api";
import { hit } from "@/lib/rate-limit";
import { createOrderRequest, isPublishType } from "@/lib/order-service";
import { HttpError } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** سازگاری با فرم قبلی: انتخاب یک پیج برای کمپین و ساخت سفارش + بلوکه. */
export async function POST(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await params;
    const limited = hit(`offer:select:${user.id}`, 60, 60 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

    const body = await readJson(req, 8_192);
    if (!body) throw new HttpError(400, "درخواست نامعتبر است.");
    const pageId = typeof body.pageId === "string" ? body.pageId : "";
    if (!/^[A-Za-z0-9_-]{10,40}$/.test(pageId)) throw new HttpError(400, "شناسهٔ پیج معتبر نیست.");
    if (!isPublishType(body.publishType)) throw new HttpError(400, "نوع انتشار معتبر نیست.");

    const result = await createOrderRequest({
      advertiserId: user.id,
      campaignId: id,
      pageId,
      publishType: body.publishType,
    });
    return NextResponse.json({ message: "درخواست ارسال شد و مبلغ بلوکه شد.", ...result });
  });
}
