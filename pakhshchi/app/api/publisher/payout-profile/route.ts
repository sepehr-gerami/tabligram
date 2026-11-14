import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { assertSameOrigin, clientIp, readJson, tooManyRequests, withErrors } from "@/lib/api";
import { hit } from "@/lib/rate-limit";
import { encryptSecret } from "@/lib/crypto";
import { parsePayoutInput } from "@/lib/identity-rules";
import { ensurePublisherProfile } from "@/lib/profiles";

export const runtime = "nodejs";

/** کارت و هویت من برای دریافت پرداخت؛ شمارهٔ کارت هرگز خام برنمی‌گردد. */
export async function GET() {
  return withErrors(async () => {
    const user = await requireUser();
    const profile = await prisma.publisherProfile.findUnique({
      where: { userId: user.id },
      select: {
        firstName: true, lastName: true, cardLast4: true, payoutStatus: true,
        payoutRejectReason: true, payoutSubmittedAt: true, payoutReviewedAt: true,
      },
    });
    return NextResponse.json(
      {
        firstName: profile?.firstName ?? null,
        lastName: profile?.lastName ?? null,
        cardLast4: profile?.cardLast4 ?? null,
        payoutStatus: profile?.payoutStatus ?? "NONE",
        payoutRejectReason: profile?.payoutRejectReason ?? null,
        payoutSubmittedAt: profile?.payoutSubmittedAt ?? null,
        payoutReviewedAt: profile?.payoutReviewedAt ?? null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}

/**
 * ثبت/به‌روزرسانی کارت پرداخت. شمارهٔ کارت و کد ملی با AES-GCM رمز می‌شوند.
 * هر تغییر، وضعیت را به PENDING برمی‌گرداند تا مدیر دوباره بررسی کند.
 */
export async function PUT(req: Request) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    const limited = hit(`payout:profile:${user.id}:${clientIp(req)}`, 10, 24 * 60 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

    const body = await readJson(req, 8_192);
    if (!body) throw new HttpError(400, "درخواست نامعتبر است.");

    const parsed = parsePayoutInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: Object.values(parsed.errors)[0], fields: parsed.errors }, { status: 400 });
    }

    await ensurePublisherProfile(user.id);
    const updated = await prisma.publisherProfile.update({
      where: { userId: user.id },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        payoutCard: encryptSecret(parsed.data.cardNumber),
        nationalIdEnc: encryptSecret(parsed.data.nationalId),
        cardLast4: parsed.data.cardLast4,
        payoutStatus: "PENDING",
        payoutRejectReason: null,
        payoutSubmittedAt: new Date(),
        payoutReviewedAt: null,
        payoutReviewedById: null,
      },
      select: { cardLast4: true, payoutStatus: true, payoutSubmittedAt: true },
    });

    return NextResponse.json({
      ...updated,
      message: "اطلاعات پرداخت ثبت شد و در انتظار تأیید مدیر است.",
    });
  });
}
