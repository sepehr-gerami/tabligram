import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, requireAdmin } from "@/lib/auth";
import { assertSameOrigin, readJson, withErrors } from "@/lib/api";
import { nextStep, type Actor } from "@/lib/money-rules";
import { commitOrderStep, notify } from "@/lib/order-transition";
import { readStoredCard } from "@/lib/payout";
import type { PagePublishType } from "@/lib/page-rules";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };
const REF_RE = /^[A-Za-z0-9\-_/]{4,60}$/;

/**
 * ثبت پرداخت مدیر به صاحب پیج.
 * فقط از وضعیت PAYOUT_DUE، بعد از رسیدن payoutDueAt، با کارت تأییدشده و شمارهٔ پیگیری.
 * کمیسیون پلتفرم از قبل در بلوکه ثابت شده و فقط مبلغ خالص به صاحب پیج پرداخت می‌شود.
 */
export async function POST(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    const { id } = await params;

    const body = await readJson(req, 4_096);
    if (!body) throw new HttpError(400, "درخواست نامعتبر است.");
    const payoutReference = typeof body.payoutReference === "string" ? body.payoutReference.trim() : "";
    if (!REF_RE.test(payoutReference)) {
      return NextResponse.json(
        { error: "شمارهٔ پیگیری پرداخت را درست وارد کنید (۴ تا ۶۰ حرف یا رقم).", fields: { payoutReference: "شمارهٔ پیگیری معتبر نیست." } },
        { status: 400 },
      );
    }

    const hold = await prisma.hold.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            campaign: { select: { advertiserId: true, title: true } },
            page: {
              select: {
                ownerId: true,
                title: true,
                owner: {
                  select: {
                    publisherProfile: {
                      select: { firstName: true, lastName: true, payoutStatus: true, payoutCard: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!hold) return NextResponse.json({ error: "بلوکه پیدا نشد." }, { status: 404 });

    const profile = hold.order.page.owner.publisherProfile;
    if (!profile || profile.payoutStatus !== "VERIFIED") {
      throw new HttpError(400, "کارت صاحب پیج هنوز تأیید نشده است؛ ابتدا در بخش احراز کارت‌ها تأیید کنید.");
    }
    const card = readStoredCard(profile.payoutCard);
    if (!card) throw new HttpError(400, "شمارهٔ کارت ذخیره‌شده معتبر نیست؛ از صاحب پیج بخواهید دوباره ثبت کند.");

    const cardHolderName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
    const now = new Date();
    const step = nextStep({
      action: "pay",
      actor: "ADMIN" as Actor,
      now,
      order: {
        status: hold.order.status,
        publishType: hold.order.publishType as PagePublishType,
        respondByAt: hold.order.respondByAt,
        publishDeadlineAt: hold.order.publishDeadlineAt,
        proofSubmittedAt: hold.order.proofSubmittedAt,
      },
      hold,
      payout: { verified: true, cardHolderName, verifiedName: cardHolderName },
    });
    if (!step.ok) throw new HttpError(400, step.error);

    const net = hold.publisherAmount > 0 ? hold.publisherAmount : hold.amount - hold.commission;
    await commitOrderStep({
      orderId: hold.order.id,
      expectedOrderStatus: hold.order.status,
      holdId: hold.id,
      expectedHoldStatus: hold.status,
      step,
      now,
      holdData: { payoutReference, paidOutAt: now, paidOutById: admin.id },
      extra: async (tx) => {
        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "HOLD_PAYOUT",
            entity: "Hold",
            entityId: hold.id,
            meta: JSON.stringify({
              orderId: hold.order.id,
              amount: hold.amount,
              commission: hold.commission,
              publisherAmount: net,
              payoutReference,
              cardLast4: card.slice(-4),
            }),
          },
        });
        await notify(
          tx,
          hold.order.page.ownerId,
          "پرداخت انجام شد",
          `مبلغ ${net.toLocaleString("fa-IR")} تومان به کارت ثبت‌شدهٔ شما واریز شد. شمارهٔ پیگیری: ${payoutReference}`,
        );
      },
    });

    return NextResponse.json({
      message: "پرداخت ثبت شد.",
      paid: net,
      commission: hold.commission,
      payoutReference,
      cardLast4: card.slice(-4),
    });
  });
}
