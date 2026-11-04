import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { assertSameOrigin, badRequest, clientIp, readJson, tooManyRequests, withErrors } from "@/lib/api";
import { hit } from "@/lib/rate-limit";
import { normalizeMobile, normalizeName, validateRegister } from "@/lib/auth-rules";

/**
 * ثبت‌نام: فقط نام + موبایل + رمز.
 * هر فیلد دیگری (از جمله role) عمداً نادیده گرفته می‌شود: نقش هرگز از کلاینت نمی‌آید.
 * همهٔ حساب‌های جدید role=USER هستند؛ ادمین فقط با seed/ابزار داخلی ساخته می‌شود.
 */
export async function POST(req: Request) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const body = await readJson(req);
    if (!body) return badRequest("درخواست نامعتبر است.");

    const name = normalizeName(String(body.name ?? ""));
    const mobile = normalizeMobile(String(body.mobile ?? ""));
    const password = String(body.password ?? "");
    const errors = validateRegister({ name, mobile, password });
    const first = Object.values(errors)[0];
    if (first) return NextResponse.json({ error: first, fields: errors }, { status: 400 });

    const limited = hit(`register:ip:${clientIp(req)}`, 5, 60 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

    const passwordHash = await hashPassword(password);
    try {
      const user = await prisma.user.create({ data: { mobile, name, passwordHash } });
      await createSession(user.id);
      return NextResponse.json({ id: user.id, name: user.name, isAdmin: false }, { status: 201 });
    } catch (err) {
      // یکتایی موبایل را خود دیتابیس تضمین می‌کند (بدون race بین «بررسی» و «ساخت»).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json({ error: "این شماره قبلاً ثبت شده است.", fields: { mobile: "این شماره قبلاً ثبت شده است." } }, { status: 409 });
      }
      throw err;
    }
  });
}
