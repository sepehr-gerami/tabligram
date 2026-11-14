// فقط سمت سرور. سفارش‌هایی که مهلتشان گذشته را می‌بندد و بلوکه را به موجودی تبلیغ‌دهنده برمی‌گرداند:
//  - درخواستی که صاحب پیج در مهلت جواب نداده (REQUEST_EXPIRED)
//  - سفارش پذیرفته‌شده‌ای که مدرک انتشارش در مهلت ثبت نشده (PUBLISH_EXPIRED)
// این تابع از چند route (انتخاب پیج، موجودی، لیست‌ها) صدا زده می‌شود و idempotent است.
import { prisma } from "@/lib/db";
import { nextStep } from "@/lib/money-rules";
import { orderForRules } from "@/lib/route-utils";

export async function expireDueOrders(now = new Date()): Promise<number> {
  const due = await prisma.order.findMany({
    where: {
      OR: [
        { status: "REQUESTED", respondByAt: { lt: now } },
        { status: "ACCEPTED", publishDeadlineAt: { lt: now } },
      ],
    },
    include: { hold: true },
    take: 100,
  });

  let expired = 0;
  for (const o of due) {
    if (!o.hold) continue;
    const step = nextStep({ action: "expire", actor: "SYSTEM", now, order: orderForRules(o), hold: o.hold });
    if (!step.ok) continue;
    const holdId = o.hold.id;

    const done = await prisma.$transaction(async (tx) => {
      const moved = await tx.order.updateMany({
        where: { id: o.id, status: o.status },
        data: { status: step.orderStatus, closedReason: step.closedReason ?? null },
      });
      if (moved.count !== 1) return false;
      await tx.hold.update({
        where: { id: holdId },
        data: { status: step.holdStatus, refundedAt: now, refundReason: step.closedReason ?? null },
      });
      return true;
    });
    if (done) expired++;
  }
  return expired;
}