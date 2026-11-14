import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, requireAdmin } from "@/lib/auth";
import { assertSameOrigin, readJson, withErrors } from "@/lib/api";
import { nextStep, type Actor } from "@/lib/money-rules";
import { commitOrderStep, notify } from "@/lib/order-transition";
import type { PagePublishType } from "@/lib/page-rules";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * تصمیم مدیر دربارهٔ اختلاف. id شناسهٔ بلوکه است.
 * action=refund → پول به تبلیغ‌دهنده برمی‌گردد؛ action=pay → سفارش به نوبت پرداخت می‌رود.
 */
export async function POST(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    const { id } = await params;

    const body = await readJson(req, 4_096);
    if (!body) throw new HttpError(400, "درخواست نامعتبر است.");
    const action = body.action === "refund" ? "resolve_refund" : body.action === "pay" ? "resolve_pay" : null;
    if (!action) throw new HttpError(400, "عملیات معتبر نیست.");
    const resolution = typeof body.resolution === "string" ? body.resolution.replace(/\s+/g, " ").trim() : "";
    if (resolution.length < 5 || resolution.length > 500) {
      return NextResponse.json({ error: "توضیح تصمیم باید بین ۵ تا ۵۰۰ حرف باشد.", fields: { resolution: "توضیح تصمیم را کامل بنویسید." } }, { status: 400 });
    }

    const hold = await prisma.hold.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            campaign: { select: { advertiserId: true } },
            page: { select: { ownerId: true } },
          },
        },
      },
    });
    if (!hold) return NextResponse.json({ error: "پرونده پیدا نشد." }, { status: 404 });

    const now = new Date();
    const step = nextStep({
      action,
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
    });
    if (!step.ok) throw new HttpError(400, step.error);

    await commitOrderStep({
      orderId: hold.order.id,
      expectedOrderStatus: hold.order.status,
      holdId: hold.id,
      expectedHoldStatus: hold.status,
      step,
      now,
      extra: async (tx) => {
        await tx.report.updateMany({
          where: { disputeOrderId: hold.order.id, status: "OPEN" },
          data: { status: "RESOLVED", resolution, resolvedById: admin.id, resolvedAt: now },
        });
        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: action === "resolve_refund" ? "DISPUTE_REFUND" : "DISPUTE_PAY",
            entity: "Hold",
            entityId: hold.id,
            meta: JSON.stringify({ orderId: hold.order.id, resolution }),
          },
        });
        const message = action === "resolve_refund"
          ? "مدیر رأی به بازگشت مبلغ به تبلیغ‌دهنده داد."
          : "مدیر رأی به پرداخت به صاحب پیج داد؛ پرداخت در صف قرار گرفت.";
        await notify(tx, hold.order.campaign.advertiserId, "تصمیم اختلاف", message);
        await notify(tx, hold.order.page.ownerId, "تصمیم اختلاف", message);
      },
    });

    return NextResponse.json({
      message: action === "resolve_refund" ? "مبلغ به کیف پول تبلیغ‌دهنده برگشت." : "سفارش به صف پرداخت منتقل شد.",
      status: step.orderStatus,
    });
  });
}
