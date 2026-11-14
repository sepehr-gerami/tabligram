import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, clientIp, tooManyRequests, withErrors } from "@/lib/api";
import { hit } from "@/lib/rate-limit";
import { dispatchCampaign } from "@/lib/order-service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** توزیع دوبارهٔ کمپین بین پیج‌های واجد شرایط (فقط صاحب کمپین). */
export async function POST(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await params;
    const limited = hit(`campaign:dispatch:${user.id}`, 20, 60 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

    const result = await dispatchCampaign(id, user.id);
    return NextResponse.json({
      ...result,
      message: result.created > 0
        ? `${result.created} درخواست جدید ارسال شد و مبلغ آن بلوکه شد.`
        : "پیج واجد شرایط جدیدی برای توزیع پیدا نشد.",
    });
  });
}
