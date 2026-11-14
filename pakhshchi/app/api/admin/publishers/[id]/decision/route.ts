import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, requireAdmin } from "@/lib/auth";
import { assertSameOrigin, readJson, withErrors } from "@/lib/api";
import { parseRejectReason } from "@/lib/page-rules";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** تأیید یا رد کارت پرداخت. کد ملیِ رمزگذاری‌شده بعد از تصمیم پاک می‌شود. */
export async function POST(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    const { id } = await params;

    const body = await readJson(req, 4_096);
    if (!body) throw new HttpError(400, "درخواست نامعتبر است.");
    const action = body.action;
    if (action !== "approve" && action !== "reject") throw new HttpError(400, "عملیات معتبر نیست.");

    let reason: string | null = null;
    if (action === "reject") {
      const parsed = parseRejectReason(body.reason);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error, fields: { reason: parsed.error } }, { status: 400 });
      reason = parsed.reason;
    }

    const profile = await prisma.publisherProfile.findUnique({
      where: { id },
      select: { id: true, userId: true, payoutStatus: true, cardLast4: true, payoutCard: true },
    });
    if (!profile) return NextResponse.json({ error: "پرونده پیدا نشد." }, { status: 404 });
    if (profile.payoutStatus !== "PENDING") throw new HttpError(409, "این پرونده در وضعیت بررسی نیست.");
    if (!profile.payoutCard || !profile.cardLast4) throw new HttpError(400, "اطلاعات کارت ناقص است.");

    const status = action === "approve" ? "VERIFIED" : "REJECTED";
    await prisma.$transaction(async (tx) => {
      const updated = await tx.publisherProfile.updateMany({
        where: { id, payoutStatus: "PENDING" },
        data: {
          payoutStatus: status,
          payoutRejectReason: reason,
          payoutReviewedAt: new Date(),
          payoutReviewedById: admin.id,
          nationalIdEnc: null,
        },
      });
      if (updated.count !== 1) throw new HttpError(409, "این پرونده هم‌زمان بررسی شده است.");
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: action === "approve" ? "PAYOUT_PROFILE_APPROVE" : "PAYOUT_PROFILE_REJECT",
          entity: "PublisherProfile",
          entityId: profile.id,
          meta: JSON.stringify({ userId: profile.userId, cardLast4: profile.cardLast4, reason }),
        },
      });
      await tx.notification.create({
        data: {
          userId: profile.userId,
          title: action === "approve" ? "کارت پرداخت تأیید شد" : "کارت پرداخت رد شد",
          body: action === "approve" ? "اطلاعات پرداخت شما تأیید شد." : `اطلاعات پرداخت شما رد شد: ${reason}`,
        },
      });
    });

    return NextResponse.json({ message: action === "approve" ? "کارت تأیید شد." : "کارت رد شد.", status });
  });
}
