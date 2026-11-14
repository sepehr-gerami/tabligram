import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, requireAdmin } from "@/lib/auth";
import { assertSameOrigin, readJson, withErrors } from "@/lib/api";
import { depositDecision } from "@/lib/money-rules";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** تأیید یا رد واریز. فقط از PENDING و به‌صورت شرطی (جلوگیری از دوبار تأیید). */
export async function POST(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await readJson(req, 4_096);
    if (!body) throw new HttpError(400, "درخواست نامعتبر است.");
    const action = body.action === "verify" ? "verify" : body.action === "reject" ? "reject" : null;
    if (!action) throw new HttpError(400, "عملیات معتبر نیست.");

    const current = await prisma.deposit.findUnique({
      where: { id },
      select: { id: true, status: true, amount: true, userId: true, reference: true },
    });
    if (!current) return NextResponse.json({ error: "واریز پیدا نشد." }, { status: 404 });

    const decision = depositDecision(current.status, action, body.reason);
    if (!decision.ok) throw new HttpError(400, decision.error);

    await prisma.$transaction(async (tx) => {
      const updated = await tx.deposit.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: decision.status,
          rejectReason: decision.status === "REJECTED" ? decision.reason ?? null : null,
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      });
      if (updated.count !== 1) throw new HttpError(409, "این واریز هم‌زمان بررسی شده است.");
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: decision.status === "VERIFIED" ? "DEPOSIT_VERIFY" : "DEPOSIT_REJECT",
          entity: "Deposit",
          entityId: id,
          meta: JSON.stringify({ amount: current.amount, userId: current.userId, reference: current.reference, reason: decision.reason ?? null }),
        },
      });
    });

    return NextResponse.json({ message: decision.status === "VERIFIED" ? "واریز تأیید شد و به موجودی اضافه شد." : "واریز رد شد." });
  });
}
