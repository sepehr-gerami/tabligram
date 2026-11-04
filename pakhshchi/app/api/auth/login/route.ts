import { NextResponse } from "next/server";
import { createSession, verifyCredentials } from "@/lib/auth";
import { assertSameOrigin, badRequest, clientIp, readJson, tooManyRequests, withErrors } from "@/lib/api";
import { hit, reset } from "@/lib/rate-limit";
import { normalizeMobile, validateLogin } from "@/lib/auth-rules";

const WINDOW_MS = 15 * 60_000;
const GENERIC_ERROR = "شمارهٔ موبایل یا رمز عبور اشتباه است.";

/** ورود: موبایل + رمز → سشن کوکی HttpOnly. نقشی از کاربر دریافت نمی‌شود. */
export async function POST(req: Request) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const body = await readJson(req);
    if (!body) return badRequest("درخواست نامعتبر است.");

    const mobile = normalizeMobile(String(body.mobile ?? ""));
    const password = String(body.password ?? "");
    if (Object.keys(validateLogin({ mobile, password })).length) return badRequest(GENERIC_ERROR);

    const byIp = hit(`login:ip:${clientIp(req)}`, 30, WINDOW_MS);
    const byMobile = hit(`login:mobile:${mobile}`, 8, WINDOW_MS);
    if (!byIp.ok || !byMobile.ok) return tooManyRequests(Math.max(byIp.retryAfterSec, byMobile.retryAfterSec));

    const user = await verifyCredentials(mobile, password);
    if (!user) return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: "حساب شما معلق شده است. با پشتیبانی تماس بگیرید." }, { status: 403 });
    }

    reset(`login:mobile:${mobile}`);
    await createSession(user.id);
    return NextResponse.json({ id: user.id, name: user.name, isAdmin: user.role === "ADMIN" });
  });
}
