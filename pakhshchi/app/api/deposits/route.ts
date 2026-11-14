import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, clientIp, readJson, tooManyRequests, withErrors } from "@/lib/api";
import { hit } from "@/lib/rate-limit";
import { parseDepositInput } from "@/lib/money-rules";
import { isSafeImageUrl } from "@/lib/image-rules";

export const runtime = "nodejs";

/** واریزهای من. */
export async function GET() {
  return withErrors(async () => {
    const user = await requireUser();
    const deposits = await prisma.deposit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, amount: true, reference: true, receiptUrl: true, note: true, status: true, rejectReason: true, createdAt: true, reviewedAt: true },
    });
    return NextResponse.json(deposits, { headers: { "Cache-Control": "no-store" } });
  });
}

/**
 * ثبت واریز کارت‌به‌کارت. تا تأیید مدیر در موجودی حساب نمی‌شود.
 * شمارهٔ پیگیری تکراری برای همان کاربر پذیرفته نمی‌شود تا رسید دوبار ثبت نشود.
 */
export async function POST(req: Request) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    const limited = hit(`deposit:create:${user.id}:${clientIp(req)}`, 10, 60 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

    const body = await readJson(req, 8_192);
    if (!body) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });

    const parsed = parseDepositInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: Object.values(parsed.errors)[0], fields: parsed.errors }, { status: 400 });
    }

    const receiptUrl = typeof body.receiptUrl === "string" ? body.receiptUrl.trim() : "";
    if (receiptUrl && !isSafeImageUrl(receiptUrl)) {
      return NextResponse.json({ error: "آدرس رسید معتبر نیست.", fields: { receiptUrl: "آدرس تصویر رسید معتبر نیست." } }, { status: 400 });
    }

    const duplicate = await prisma.deposit.findFirst({
      where: { userId: user.id, reference: parsed.data.reference, status: { not: "REJECTED" } },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ error: "این شمارهٔ پیگیری قبلاً ثبت شده است.", fields: { reference: "این شمارهٔ پیگیری قبلاً ثبت شده است." } }, { status: 409 });
    }

    const deposit = await prisma.deposit.create({
      data: {
        userId: user.id,
        amount: parsed.data.amount,
        reference: parsed.data.reference,
        note: parsed.data.note || null,
        receiptUrl: receiptUrl || null,
        status: "PENDING",
      },
      select: { id: true, amount: true, reference: true, status: true, createdAt: true },
    });
    return NextResponse.json({ deposit, message: "واریز ثبت شد؛ پس از تأیید مدیر به موجودی اضافه می‌شود." }, { status: 201 });
  });
}
