import { NextResponse } from "next/server";
import { HttpError } from "@/lib/auth";

/** Wrapper برای Route Handler ها: خطای HttpError → پاسخ استاندارد JSON، خطای ناشناخته → ۵۰۰ بدون افشای جزئیات. */
export function withErrors(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((err) => {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api]", err);
    return NextResponse.json({ error: "خطای غیرمنتظره در سرور." }, { status: 500 });
  });
}

export const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });
export const ok = <T,>(data: T) => NextResponse.json(data);
export const tooManyRequests = (retryAfterSec: number) =>
  NextResponse.json(
    { error: "تعداد تلاش‌ها زیاد است. کمی بعد دوباره امتحان کنید." },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );

export const toInt = (v: string | null): number | null => {
  if (v === null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};
export const toIsoOrNull = (v: string | null): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * آی‌پی کلاینت. توجه: X-Forwarded-For فقط پشت یک reverse proxy مورد اعتماد (مثل Vercel/Nginx خودت)
 * قابل اتکاست؛ در غیر این صورت کاربر می‌تواند جعلش کند و محدودیت نرخ را دور بزند.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** دفاع در برابر CSRF برای درخواست‌های تغییردهنده: Origin باید با هاست خودِ سایت یکی باشد. */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) {
    const site = req.headers.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") throw new HttpError(403, "درخواست نامعتبر است.");
    return;
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    /* Origin خراب → رد می‌شود */
  }
  if (!host || originHost !== host) throw new HttpError(403, "درخواست نامعتبر است.");
}

/** بدنهٔ JSON با سقف حجم؛ در صورت نامعتبر بودن null. فقط آبجکت ساده پذیرفته می‌شود. */
export async function readJson(req: Request, maxBytes = 16_384): Promise<Record<string, unknown> | null> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return null;
  const text = await req.text().catch(() => null);
  if (text === null || text.length > maxBytes) return null;
  try {
    const v: unknown = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
