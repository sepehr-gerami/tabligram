// ثبت اتمیک نتیجهٔ ماشین حالت سفارش/بلوکه.
// محافظت خوش‌بینانه: هر دو رکورد فقط اگر از وضعیت خوانده‌شده تغییر نکرده باشند به‌روز می‌شوند،
// وگرنه کل تراکنش با ۴۰۹ برمی‌گردد. این کار دو درخواست هم‌زمان (مثلاً دوبار پرداخت) را رد می‌کند.
import { Prisma, type HoldStatus, type OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/auth";
import type { StepResult } from "@/lib/money-rules";

type OkStep = Extract<StepResult, { ok: true }>;

export interface CommitStepInput {
  orderId: string;
  expectedOrderStatus: string;
  holdId: string | null;
  expectedHoldStatus: string | null;
  step: OkStep;
  now: Date;
  orderData?: Prisma.OrderUncheckedUpdateManyInput;
  holdData?: Prisma.HoldUncheckedUpdateManyInput;
  extra?: (tx: Prisma.TransactionClient) => Promise<void>;
}

export async function commitOrderStep(input: CommitStepInput): Promise<void> {
  const { step, now } = input;
  await prisma.$transaction(async (tx) => {
    const orderUpdate = await tx.order.updateMany({
      where: { id: input.orderId, status: input.expectedOrderStatus as OrderStatus },
      data: {
        status: step.orderStatus as OrderStatus,
        ...(step.reveal ? { revealedAt: now } : {}),
        ...(step.publishDeadlineAt ? { publishDeadlineAt: step.publishDeadlineAt } : {}),
        ...(step.proofSubmittedAt ? { proofSubmittedAt: step.proofSubmittedAt } : {}),
        ...(step.closedReason ? { closedReason: step.closedReason } : {}),
        ...(input.orderData ?? {}),
      },
    });
    if (orderUpdate.count !== 1) {
      throw new HttpError(409, "وضعیت سفارش هم‌زمان تغییر کرده است؛ صفحه را تازه کنید.");
    }

    if (input.holdId && input.expectedHoldStatus) {
      const holdUpdate = await tx.hold.updateMany({
        where: { id: input.holdId, status: input.expectedHoldStatus as HoldStatus },
        data: {
          status: step.holdStatus as HoldStatus,
          ...(step.holdStatus === "PAYOUT_DUE" && step.payoutDueAt ? { payoutDueAt: step.payoutDueAt } : {}),
          ...(step.holdStatus === "REFUNDED" ? { refundedAt: now } : {}),
          ...(step.holdStatus === "DISPUTED" ? { disputedAt: now } : {}),
          ...(input.holdData ?? {}),
        },
      });
      if (holdUpdate.count !== 1) {
        throw new HttpError(409, "وضعیت مالی این سفارش هم‌زمان تغییر کرده است؛ صفحه را تازه کنید.");
      }
    }

    await input.extra?.(tx);
  });
}

/** ساخت اعلان ساده برای کاربر (بدون آدرس یا اطلاعات حساس). */
export async function notify(tx: Prisma.TransactionClient, userId: string, title: string, body: string): Promise<void> {
  await tx.notification.create({ data: { userId, title, body } });
}
