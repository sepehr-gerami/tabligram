import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { nextStep } from "@/lib/money-rules";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const payoutReference = body.payoutReference; // شماره پیگیری بانکی

    if (!payoutReference) {
      return NextResponse.json({ error: "شماره پیگیری پرداخت الزامی است." }, { status: 400 });
    }

    const hold = await prisma.hold.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            page: {
              include: { owner: { include: { publisherProfile: true } } }
            }
          }
        }
      }
    });

    if (!hold) return NextResponse.json({ error: "بلوکه یافت نشد." }, { status: 404 });

    const profile = hold.order.page.owner.publisherProfile;
    if (!profile) {
      return NextResponse.json({ error: "اطلاعات پروفایل صاحب پیج ناقص است." }, { status: 400 });
    }

    const now = new Date();
    
    const stepResult = nextStep({
      action: "pay",
      actor: "ADMIN",
      now,
      order: {
        status: hold.order.status,
        publishType: hold.order.publishType as "story" | "post" | "reels",
        respondByAt: hold.order.respondByAt,
        publishDeadlineAt: hold.order.publishDeadlineAt,
        proofSubmittedAt: hold.order.proofSubmittedAt,
      },
      hold: hold,
      payout: {
        verified: profile.payoutStatus === "VERIFIED",
        cardHolderName: `${profile.firstName} ${profile.lastName}`,
        verifiedName: `${profile.firstName} ${profile.lastName}`, 
      }
    });

    if (!stepResult.ok) {
      return NextResponse.json({ error: stepResult.error }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. سفارش تکمیل شد
      await tx.order.update({
        where: { id: hold.orderId },
        data: { status: stepResult.orderStatus } // PAID_FULL
      });

      // 2. پول پرداخت شد
      await tx.hold.update({
        where: { id: hold.id },
        data: {
          status: stepResult.holdStatus, // PAID_OUT
          paidOutAt: now,
          paidOutById: admin.id,
          payoutReference: payoutReference
        }
      });

      // 3. ثبت لاگ
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "HOLD_PAYOUT",
          entity: "Hold",
          entityId: hold.id,
          meta: JSON.stringify({ amount: hold.amount, reference: payoutReference })
        }
      });
    });

    return NextResponse.json({ message: "پرداخت با موفقیت ثبت شد." });
  });
}