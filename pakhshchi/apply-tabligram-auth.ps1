# Tabligram - apply auth / env / schema update
# Run from the project root (the folder that contains package.json):
#   powershell -ExecutionPolicy Bypass -File .\apply-tabligram-auth.ps1
$ErrorActionPreference = "Stop"
$root = (Get-Location).Path
$utf8 = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path (Join-Path $root "package.json")) -or -not (Test-Path (Join-Path $root "prisma\schema.prisma"))) {
  Write-Host "ERROR: run this from the project root (package.json and prisma\schema.prisma not found here)." -ForegroundColor Red
  exit 1
}

$stamp  = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $root (".backup-tabligram-" + $stamp)
$script:written = 0
$script:backedUp = 0

function Write-ProjectFile([string]$rel, [string]$content) {
  $full = Join-Path $root ($rel -replace "/", "\")
  $dir  = Split-Path $full -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  if (Test-Path $full) {
    $bak = Join-Path $backup ($rel -replace "/", "\")
    $bakDir = Split-Path $bak -Parent
    if (-not (Test-Path $bakDir)) { New-Item -ItemType Directory -Path $bakDir -Force | Out-Null }
    Copy-Item $full $bak -Force
    $script:backedUp++
  }
  [System.IO.File]::WriteAllText($full, ($content.TrimEnd() + "`n"), $utf8)
  $script:written++
  Write-Host ("  wrote  " + $rel)
}

Write-Host "== 1/4 writing files (originals are copied to $backup) =="

Write-ProjectFile "lib/brand.ts" @'
/**
 * تنها منبع نام برند. اگر املای نام فارسی یا انگلیسی عوض شد، فقط همین‌جا را تغییر بده.
 */
export const BRAND_EN = "Tabligram";
export const BRAND_FA = "تبلیگرام";
'@

Write-ProjectFile "lib/env.ts" @'
// فقط سمت سرور. این فایل را در کامپوننت‌های کلاینت import نکن.
//
// مقدارها «تنبل» (lazy) خوانده می‌شوند تا `next build` بدون env هم خراب نشود،
// ولی در اولین درخواست واقعیِ production، نبودِ مقدار ضروری خطای واضح می‌دهد.

const DEV_FALLBACK_SECRET = "tabligram-dev-only-secret-not-for-production!!";

const isProd = () => process.env.NODE_ENV === "production";

/**
 * کلید اصلی برنامه (رمزگذاری توکن‌های اینستاگرام).
 * - production: الزامی و حداقل ۳۲ کاراکتر.
 * - توسعه: اگر تنظیم نشده باشد مقدار موقت استفاده می‌شود.
 * هشدار: عوض کردن این مقدار، توکن‌های رمزگذاری‌شدهٔ قبلی را غیرقابل‌خواندن می‌کند.
 */
export function getAppSecret(): string {
  const raw = process.env.APP_SECRET?.trim();
  if (raw) {
    if (raw.length < 32) throw new Error("APP_SECRET must be at least 32 characters.");
    return raw;
  }
  if (isProd()) throw new Error("APP_SECRET is required in production.");
  return DEV_FALLBACK_SECRET;
}

export interface MetaConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

/** تنظیمات اپ Meta برای OAuth اینستاگرام؛ اگر کامل نباشد null (اتصال رسمی غیرفعال می‌ماند). */
export function getMetaConfig(): MetaConfig | null {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  const redirectUri = process.env.META_REDIRECT_URI?.trim();
  return appId && appSecret && redirectUri ? { appId, appSecret, redirectUri } : null;
}
'@

Write-ProjectFile "lib/crypto.ts" @'
// رمزگذاری/رمزگشایی توکن‌های اینستاگرام با AES-256-GCM.
// توکن خام هرگز در دیتابیس ذخیره نمی‌شود. فرمت خروجی: v1.<iv>.<tag>.<data> (همه base64).
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "crypto";
import { getAppSecret } from "@/lib/env";

const VERSION = "v1";

let cached: { secret: string; key: Buffer } | null = null;

/** کلید ۳۲ بایتی از APP_SECRET با HKDF (نه هش ساده). */
function getKey(): Buffer {
  const secret = getAppSecret();
  if (!cached || cached.secret !== secret) {
    cached = {
      secret,
      key: Buffer.from(hkdfSync("sha256", secret, "tabligram-salt-v1", "instagram-token-encryption", 32)),
    };
  }
  return cached.key;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

export function decryptSecret(blob: string): string | null {
  try {
    const [version, ivB64, tagB64, dataB64] = blob.split(".");
    if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
'@

Write-ProjectFile "lib/rate-limit.ts" @'
// محدودکنندهٔ نرخ درخواست، در حافظهٔ پروسه.
// مناسب توسعه و یک سرور واحد است. اگر چند instance اجرا شود، باید به Redis یا جدول دیتابیس منتقل شود.

interface Bucket { count: number; resetAt: number }

const g = globalThis as unknown as { __tabligramRate?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = (g.__tabligramRate ??= new Map());

function sweep(now: number) {
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/** یک تلاش را می‌شمارد. اگر از سقف گذشت، ok=false و زمان انتظار برمی‌گردد. */
export function hit(key: string, limit: number, windowMs: number, now = Date.now()) {
  if (buckets.size > 5000) sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > limit) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  return { ok: true, retryAfterSec: 0 };
}

export function reset(key: string) {
  buckets.delete(key);
}
'@

Write-ProjectFile "lib/auth-rules.ts" @'
// قوانین مشترک ورود/ثبت‌نام. هم در کلاینت (فرم) و هم در سرور (API) استفاده می‌شود؛
// پس هیچ import سمت‌سروری در این فایل نیست. سرور همیشه دوباره اعتبارسنجی می‌کند.
import { toLatinDigits } from "@/lib/utils";

export const MIN_PASSWORD_LENGTH = 8;
/** bcrypt فقط ۷۲ بایت اول رمز را در نظر می‌گیرد؛ حرف فارسی در UTF-8 دو بایت است. */
export const MAX_PASSWORD_BYTES = 72;
export const MOBILE_RE = /^09\d{9}$/;

/** ارقام فارسی/عربی را لاتین می‌کند، فاصله و نیم‌فاصله را حذف و پیش‌شمارهٔ +98 را به 0 تبدیل می‌کند. */
export const normalizeMobile = (s: string) =>
  toLatinDigits(s)
    .replace(/[\s\u200c-]/g, "")
    .replace(/^(\+98|0098|98)(?=9\d{9}$)/, "0");

export const isMobile = (s: string) => MOBILE_RE.test(s);

export const normalizeName = (s: string) => s.replace(/\s+/g, " ").trim();

export type AuthField = "name" | "mobile" | "password";
export type AuthErrors = Partial<Record<AuthField, string>>;

const byteLength = (s: string) => new TextEncoder().encode(s).length;

/** مشکل رمز عبور برای ثبت‌نام؛ undefined یعنی قابل‌قبول. */
export function passwordProblem(password: string, mobile = ""): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) return `رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد.`;
  if (byteLength(password) > MAX_PASSWORD_BYTES) return "رمز عبور بیش از حد طولانی است.";
  if (/^\d+$/.test(toLatinDigits(password))) return "رمز عبور نباید فقط عدد باشد.";
  if (mobile && toLatinDigits(password).includes(mobile)) return "رمز عبور نباید شمارهٔ موبایل شما باشد.";
  return undefined;
}

/** در ورود قوانین رمز را فاش نمی‌کنیم؛ فقط خالی نبودن. */
export function validateLogin(v: { mobile: string; password: string }): AuthErrors {
  const e: AuthErrors = {};
  if (!isMobile(v.mobile)) e.mobile = "شمارهٔ موبایل را به شکل ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.";
  if (!v.password) e.password = "رمز عبور را وارد کنید.";
  return e;
}

export function validateRegister(v: { name: string; mobile: string; password: string }): AuthErrors {
  const e: AuthErrors = {};
  if (v.name.length < 3) e.name = "نام و نام خانوادگی را وارد کنید.";
  else if (v.name.length > 60) e.name = "نام حداکثر ۶۰ حرف باشد.";
  if (!isMobile(v.mobile)) e.mobile = "شمارهٔ موبایل را به شکل ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.";
  const pw = passwordProblem(v.password, v.mobile);
  if (pw) e.password = pw;
  return e;
}
'@

Write-ProjectFile "lib/api.ts" @'
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
'@

Write-ProjectFile "lib/auth.ts" @'
import { createHash, randomBytes } from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "tabligram_session";
const SESSION_DAYS = 30;
const MAX_SESSIONS_PER_USER = 10;
const BCRYPT_COST = 12;

/** خطای قابل‌نمایش به کاربر با کد HTTP (توسط withErrors به JSON تبدیل می‌شود). */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/* ------------------------------------------------------------------ */
/* رمز عبور                                                            */
/* ------------------------------------------------------------------ */

export const hashPassword = (pw: string) => bcrypt.hash(pw, BCRYPT_COST);

let timingPad: Promise<string> | undefined;

/**
 * بررسی موبایل + رمز. اگر کاربر وجود نداشته باشد هم یک مقایسهٔ bcrypt انجام می‌شود
 * تا زمان پاسخ، وجود یا نبود شماره را لو ندهد.
 */
export async function verifyCredentials(mobile: string, password: string) {
  const user = await prisma.user.findUnique({ where: { mobile } });
  const hash = user?.passwordHash ?? (await (timingPad ??= bcrypt.hash("tabligram-timing-pad", BCRYPT_COST)));
  const passwordOk = await bcrypt.compare(password, hash);
  return user && passwordOk ? user : null;
}

/* ------------------------------------------------------------------ */
/* سشن                                                                 */
/* ------------------------------------------------------------------ */

/**
 * ساخت سشن جدید و ست کوکی HttpOnly.
 * - سشن قبلیِ همین مرورگر باطل می‌شود (جلوگیری از session fixation).
 * - سشن‌های منقضی پاک می‌شوند و حداکثر ۱۰ سشن فعال برای هر کاربر می‌ماند.
 */
export async function createSession(userId: string): Promise<void> {
  const jar = await cookies();
  const previous = jar.get(SESSION_COOKIE)?.value;
  if (previous) await prisma.session.deleteMany({ where: { tokenHash: hashToken(previous) } });
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  const surplus = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: MAX_SESSIONS_PER_USER - 1,
    select: { id: true },
  });
  if (surplus.length) await prisma.session.deleteMany({ where: { id: { in: surplus.map((s) => s.id) } } });

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    jar.delete(SESSION_COOKIE);
  }
}

/** همهٔ سشن‌های یک کاربر را باطل می‌کند (تعلیق حساب، تغییر رمز). */
export async function destroyUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export interface SessionUser {
  id: string;
  name: string;
  mobile: string;
  role: Role; // USER یا ADMIN؛ نقش تبلیغ‌کننده/صاحب پیج از روی پروفایل‌ها مشتق می‌شود
  status: UserStatus;
  trustScore: number;
  isAdmin: boolean;
  isAdvertiser: boolean;
  isPublisher: boolean;
}

/** کاربر لاگین‌شده از کوکی؛ در صورت نبود سشن معتبر یا حساب معلق، null. در هر رندر فقط یک‌بار کوئری می‌زند. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true, name: true, mobile: true, role: true, status: true, trustScore: true,
          advertiserProfile: { select: { id: true } },
          publisherProfile: { select: { id: true } },
        },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  const u = session.user;
  if (u.status !== "ACTIVE") return null;
  return {
    id: u.id, name: u.name, mobile: u.mobile, role: u.role, status: u.status, trustScore: u.trustScore,
    isAdmin: u.role === "ADMIN",
    isAdvertiser: u.advertiserProfile !== null,
    isPublisher: u.publisherProfile !== null,
  };
});

/* ------------------------------------------------------------------ */
/* کنترل دسترسی سمت سرور                                                */
/* ------------------------------------------------------------------ */

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "ابتدا وارد حساب خود شوید.");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) throw new HttpError(403, "دسترسی لازم را ندارید.");
  return user;
}

export async function requireAdvertiser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdvertiser) throw new HttpError(403, "برای این کار ابتدا پروفایل تبلیغ‌کننده بسازید.");
  return user;
}

export async function requirePublisher(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isPublisher) throw new HttpError(403, "برای این کار ابتدا پروفایل صاحب پیج بسازید.");
  return user;
}

/** برای سازگاری با کدهای قبلی؛ فقط نقش‌های سیستمی (USER/ADMIN). */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new HttpError(403, "دسترسی لازم را ندارید.");
  return user;
}
'@

Write-ProjectFile "lib/profiles.ts" @'
// پروفایل‌ها جایگزین «انتخاب نقش» هستند: کاربر هنگام ثبت‌نام نقش انتخاب نمی‌کند؛
// وقتی برای اولین بار کمپین می‌سازد یا پیج ثبت می‌کند، پروفایل مربوط ساخته می‌شود.
// این توابع idempotent هستند و باید از API های «ساخت کمپین» و «ثبت پیج» صدا زده شوند.
import { prisma } from "@/lib/db";

export const ensureAdvertiserProfile = (userId: string, businessName: string) =>
  prisma.advertiserProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, businessName: businessName.trim() },
  });

export const ensurePublisherProfile = (userId: string) =>
  prisma.publisherProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
'@

Write-ProjectFile "app/api/auth/login/route.ts" @'
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
'@

Write-ProjectFile "app/api/auth/register/route.ts" @'
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
'@

Write-ProjectFile "app/api/auth/session/route.ts" @'
import { NextResponse } from "next/server";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { assertSameOrigin, ok, withErrors } from "@/lib/api";

/** کاربر فعلی (یا null) با پرچم‌های isAdmin / isAdvertiser / isPublisher. */
export async function GET() {
  return withErrors(async () => {
    const user = await getCurrentUser();
    return NextResponse.json(user, { headers: { "Cache-Control": "no-store" } });
  });
}

/** خروج. */
export async function DELETE(req: Request) {
  return withErrors(async () => {
    assertSameOrigin(req);
    await destroySession();
    return ok({ ok: true });
  });
}
'@

Write-ProjectFile "components/layout/auth-dialog.tsx" @'
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, describe } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { BRAND_FA } from "@/lib/brand";
import {
  MIN_PASSWORD_LENGTH, normalizeMobile, normalizeName, validateLogin, validateRegister,
  type AuthErrors, type AuthField,
} from "@/lib/auth-rules";

export type AuthMode = "login" | "register";

const FIELD_ORDER: AuthField[] = ["name", "mobile", "password"];

export function AuthDialog({ mode, onClose }: { mode: AuthMode | null; onClose: () => void }) {
  return (
    <Dialog open={mode !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>{mode && <AuthForm key={mode} mode={mode} onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}

/**
 * فرم ورود/ثبت‌نام واقعی (بدون انتخاب نقش).
 * نقش تبلیغ‌کننده یا صاحب پیج از روی کاری که کاربر بعداً می‌کند (ساخت کمپین / ثبت پیج) ساخته می‌شود.
 */
function AuthForm({ mode, onDone }: { mode: AuthMode; onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState({ name: "", mobile: "", password: "" });
  const [errors, setErrors] = useState<AuthErrors>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    const name = normalizeName(values.name);
    const mobile = normalizeMobile(values.mobile);
    const found = isRegister
      ? validateRegister({ name, mobile, password: values.password })
      : validateLogin({ mobile, password: values.password });
    setErrors(found);
    setServerError("");
    const firstInvalid = FIELD_ORDER.find((f) => found[f]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { name, mobile, password: values.password } : { mobile, password: values.password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        name?: string; isAdmin?: boolean; error?: string; fields?: AuthErrors;
      };
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        setServerError(typeof data.error === "string" ? data.error : "مشکلی پیش آمد. دوباره تلاش کنید.");
        return;
      }
      toast({
        tone: "success",
        title: isRegister ? "حساب شما ساخته شد" : "وارد شدید",
        description: data.name ? `${data.name} عزیز، خوش آمدید.` : undefined,
      });
      onDone();
      if (data.isAdmin) router.push("/admin");
      router.refresh();
    } catch {
      setServerError("ارتباط با سرور برقرار نشد. اینترنت خود را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{isRegister ? `ثبت‌نام در ${BRAND_FA}` : `ورود به ${BRAND_FA}`}</DialogTitle>
        <DialogDescription>
          {isRegister
            ? "با شمارهٔ موبایل حساب بسازید. بعداً هر وقت خواستید می‌توانید کمپین بسازید یا پیج خود را ثبت کنید."
            : "شمارهٔ موبایل و رمز عبور خود را وارد کنید."}
        </DialogDescription>
      </DialogHeader>
      {serverError && <Alert tone="warning">{serverError}</Alert>}
      {isRegister && (
        <Field id="name" label="نام و نام خانوادگی" required error={errors.name}>
          <Input {...describe("name", errors.name)} autoComplete="name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
        </Field>
      )}
      <Field id="mobile" label="شمارهٔ موبایل" required error={errors.mobile}>
        <Input {...describe("mobile", errors.mobile)} dir="ltr" className="text-end" type="tel" inputMode="numeric" autoComplete="tel" placeholder="09121234567" value={values.mobile} onChange={(e) => setValues({ ...values, mobile: e.target.value })} />
      </Field>
      <Field id="password" label="رمز عبور" required error={errors.password}>
        <Input {...describe("password", errors.password)} dir="ltr" className="text-end" type="password" autoComplete={isRegister ? "new-password" : "current-password"} placeholder={isRegister ? `حداقل ${MIN_PASSWORD_LENGTH} کاراکتر` : undefined} value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? "لطفاً صبر کنید…" : isRegister ? "ساخت حساب" : "ورود"}
      </Button>
    </form>
  );
}
'@

Write-ProjectFile "prisma/schema.prisma" @'
// تبلیگرام (Tabligram) — Schema کامل دیتابیس
// بدون کیف پول واسط / Escrow: پرداخت‌ها مستقیم از تبلیغ‌کننده به صاحب پیج ثبت و تأیید می‌شوند.

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ---------- کاربران و نقش‌ها ----------

// نقش سیستمی. «تبلیغ‌کننده» و «صاحب پیج» نقش نیستند؛ قابلیت‌اند و از وجود
// AdvertiserProfile / PublisherProfile مشتق می‌شوند (یک کاربر می‌تواند هر دو را داشته باشد).
// ADMIN فقط از طریق seed یا ابزار داخلی ساخته می‌شود، هرگز از فرم ثبت‌نام.
enum Role {
  USER
  ADMIN
}

enum UserStatus {
  ACTIVE
  SUSPENDED
}

model User {
  id            String     @id @default(cuid())
  mobile        String     @unique // شماره موبایل، شناسه اصلی ورود
  passwordHash  String
  name          String
  role          Role       @default(USER)
  status        UserStatus @default(ACTIVE)
  trustScore    Int        @default(50) // امتیاز اعتبار 0..100
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  advertiserProfile AdvertiserProfile?
  publisherProfile  PublisherProfile?
  pages             InstaPage[]
  campaigns         Campaign[]
  sessions          Session[]
  notifications     Notification[]
  reportsFiled      Report[]   @relation("Reporter")
  reportsAgainst    Report[]   @relation("ReportedUser")
  ratingsGiven      UserRating[] @relation("Rater")
  ratingsReceived   UserRating[] @relation("Rated")
  auditLogs         AuditLog[]
  adminBanners      Banner[]   @relation("BannerAuthor")
  adminActionReports Report[]  @relation("AdminResolver")

  @@index([role])
}

model AdvertiserProfile {
  id           String  @id @default(cuid())
  userId       String  @unique
  businessName String
  website      String?
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model PublisherProfile {
  id             String   @id @default(cuid())
  userId         String   @unique
  payoutCard     String?  // شماره کارت برای پرداخت مستقیم (حساس: فقط به طرف سفارشِ توافق‌شده نمایش داده شود)
  payoutIban     String?
  bio            String?
  createdAt      DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// ---------- صفحات اینستاگرام ----------

enum PageStatus {
  PENDING   // ثبت‌شده، در انتظار تأیید ادمین
  APPROVED
  REJECTED
  DISABLED  // غیرفعال توسط ادمین
}

enum VerificationMethod {
  GRAPH
  BIO_CODE
  MANUAL
}

enum VerificationStatus {
  UNVERIFIED
  AWAITING
  VERIFIED
}

enum StatsSource {
  SELF   // خوداظهاری صاحب پیج
  API    // تأییدشده از Instagram Graph API
}

model InstaPage {
  id            String             @id @default(cuid())
  ownerId       String
  handle        String             @unique // شناسه عمومی پیج = آیدی اینستاگرام
  title         String
  category      String
  city          String?
  bio           String?
  followers     Int                @default(0)
  avgPostViews  Int                @default(0)
  avgReelsViews Int                @default(0)
  pricePost     Int                @default(0)
  priceReels    Int                @default(0)
  status        PageStatus         @default(PENDING)
  rejectReason  String?
  avatarUrl     String?
  statsSource   StatsSource        @default(SELF)
  lastSyncAt    DateTime?
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  owner           User               @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  verification    PageVerification?
  instagramAccount InstagramAccount?
  statsHistory    PageStatsSnapshot[]
  orders          Order[]
  reports         Report[]           @relation("ReportedPage")

  @@index([ownerId])
  @@index([status])
  @@index([category])
}

model PageVerification {
  id          String             @id @default(cuid())
  pageId      String             @unique
  status      VerificationStatus @default(UNVERIFIED)
  method      VerificationMethod?
  code        String?  // کد موقت بیو
  codeExpiresAt DateTime?
  verifiedAt  DateTime?
  note        String?

  page InstaPage @relation(fields: [pageId], references: [id], onDelete: Cascade)
}

model InstagramAccount {
  id                String   @id @default(cuid())
  pageId            String   @unique
  platformUserId    String   // ig user id از Graph API
  accessTokenEnc    String   // توکن رمزگذاری‌شده (AES)، هرگز خام ذخیره نمی‌شود
  tokenExpiresAt    DateTime?
  connectedAt       DateTime @default(now())

  page InstaPage @relation(fields: [pageId], references: [id], onDelete: Cascade)
}

model PageStatsSnapshot {
  id        String   @id @default(cuid())
  pageId    String
  followers Int
  avgViews  Int
  reach     Int?
  takenAt   DateTime @default(now())

  page InstaPage @relation(fields: [pageId], references: [id], onDelete: Cascade)

  @@index([pageId, takenAt])
}

// ---------- کمپین‌ها و سفارش‌ها ----------

enum CampaignStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  REJECTED
  RUNNING
  COMPLETED
  CANCELLED
}

enum OrderStatus {
  REQUESTED        // درخواست ارسال‌شده به صاحب پیج
  ACCEPTED         // صاحب پیج پذیرفت
  DECLINED
  NEGOTIATING
  AGREED           // توافق نهایی ثبت شد
  PARTIALLY_PAID   // پرداخت مرحله ۱ تأیید شد
  IN_PROGRESS      // صاحب پیج تبلیغ را اجرا می‌کند
  PUBLISHED        // مدرک انتشار ثبت شد
  CONFIRMED        // تبلیغ‌کننده تأیید کرد
  PAID_FULL        // پرداخت مرحله ۲ تأیید شد → بسته‌شده
  DISPUTED
  CANCELLED
}

enum PaymentStage {
  STAGE1 // پیش‌پرداخت مستقیم (۳۰ تا ۵۰ درصد)
  STAGE2 // تسویه پس از تأیید تبلیغ
}

enum PaymentStatus {
  DECLARED      // تبلیغ‌کننده اعلام کرد پرداخت کرده (رسید ثبت شد)
  CONFIRMED     // صاحب پیج دریافت را تأیید کرد (شرط لازم برای مرحله بعد)
  REJECTED      // صاحب پیج پرداخت را رد کرد
}

model Campaign {
  id          String         @id @default(cuid())
  orderNumber String         @unique
  advertiserId String
  title       String
  business    String
  description String
  link        String
  mediaUrl    String?
  mediaKind   String?        // image | video
  budget      Int            // تومان
  minFollowers Int?
  targetViews Int?
  category    String?
  city        String?
  notes       String?
  publishType String         // post | reels
  publishAt   DateTime?      // زمان انتشار موردنظر
  status      CampaignStatus @default(DRAFT)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  advertiser User      @relation(fields: [advertiserId], references: [id])
  orders     Order[]

  @@index([advertiserId])
  @@index([status])
}

model Order {
  id          String      @id @default(cuid())
  campaignId  String
  pageId      String
  amount      Int         // مبلغ توافق‌شده برای این انتشار (تومان)
  publishType String
  publishAt   DateTime?
  terms       String?     // شرایط توافق‌شده
  status      OrderStatus @default(REQUESTED)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  campaign  Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  page      InstaPage @relation(fields: [pageId], references: [id])
  payments  Payment[]
  proofs    OrderProof[]
  disputes  Report[] @relation("DisputeOrder")

  @@unique([campaignId, pageId])
  @@index([pageId])
  @@index([status])
}

// پرداخت مستقیم: پول هرگز وارد پلتفرم نمی‌شود؛ فقط رویدادها و تأییدیه‌ها ثبت می‌شوند.
model Payment {
  id             String        @id @default(cuid())
  orderId        String
  stage          PaymentStage
  amount         Int
  method         String        // کارت به کارت | درگاه اختصاصی صاحب پیج | ...
  reference      String?       // شماره پیگیری تراکنش / شماره‌ی درگاه
  receiptUrl     String?       // لینک یا نام فایل رسید
  declaredAt     DateTime      @default(now()) // زمان اعلام پرداخت توسط تبلیغ‌کننده
  status         PaymentStatus @default(DECLARED)
  confirmedAt    DateTime?
  confirmedByPage Boolean?     // true = تأیید صاحب پیج
  note           String?

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  // عمداً @@unique([orderId, stage]) نیست: اگر صاحب پیج پرداختی را رد کند، تبلیغ‌کننده باید بتواند
  // دوباره اعلام کند. «حداکثر یک پرداخت غیررد‌شده برای هر مرحله» را لایهٔ سرویس داخل Transaction تضمین می‌کند.
  @@index([orderId, stage])
  @@index([status])
}

model OrderProof {
  id        String   @id @default(cuid())
  orderId   String
  proofUrl  String
  caption   String?
  createdAt DateTime @default(now())

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
}

// ---------- امتیازدهی و اعتبار ----------

model UserRating {
  id        String   @id @default(cuid())
  raterId   String
  ratedId   String
  orderId   String?
  stars     Int      // 1..5
  comment   String?
  createdAt DateTime @default(now())

  rater User @relation("Rater", fields: [raterId], references: [id])
  rated User @relation("Rated", fields: [ratedId], references: [id])

  @@unique([raterId, orderId])
  @@index([ratedId])
}

// ---------- گزارش تخلف و اختلاف ----------

enum ReportKind {
  PAGE_ABUSE
  ORDER_DISPUTE
  USER_ABUSE
}

enum ReportStatus {
  OPEN
  RESOLVED
  DISMISSED
}

model Report {
  id         String       @id @default(cuid())
  kind       ReportKind
  reporterId String?
  reportedUserId String?
  reportedPageId String?
  disputeOrderId String?
  subject    String
  body       String
  status     ReportStatus @default(OPEN)
  resolution String?
  resolvedById String?
  resolvedAt DateTime?
  createdAt  DateTime     @default(now())

  reporter      User?     @relation("Reporter", fields: [reporterId], references: [id])
  reportedUser  User?     @relation("ReportedUser", fields: [reportedUserId], references: [id])
  reportedPage  InstaPage? @relation("ReportedPage", fields: [reportedPageId], references: [id])
  disputeOrder  Order?    @relation("DisputeOrder", fields: [disputeOrderId], references: [id])
  resolvedBy    User?     @relation("AdminResolver", fields: [resolvedById], references: [id])

  @@index([status])
  @@index([kind])
}

// ---------- بنرهای تبلیغاتی سایت (CMS) ----------

enum BannerPlacement {
  HERO        // اسلایدر صفحه اصلی
  SIDEBAR
  FOOTER
  PAGES_TOP   // بالای دایرکتوری پیج‌ها
}

model Banner {
  id           String          @id @default(cuid())
  title        String
  description  String?
  link         String
  desktopImage String?
  mobileImage  String?
  placement    BannerPlacement @default(HERO)
  sortOrder    Int             @default(0)
  isActive     Boolean         @default(true)
  startsAt     DateTime?
  endsAt       DateTime?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  createdById  String?

  createdBy User? @relation("BannerAuthor", fields: [createdById], references: [id])

  @@index([placement, sortOrder, isActive])
}

// ---------- اعلان‌ها ----------

model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  body      String
  readAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt])
}

// ---------- گزارش فعالیت‌های مدیریتی (Audit Log) ----------

model AuditLog {
  id        String   @id @default(cuid())
  actorId   String?
  action    String   // مثلا PAGE_APPROVE, BANNER_CREATE, ORDER_CANCEL
  entity    String
  entityId  String
  meta      String?  // JSON
  createdAt DateTime @default(now())

  actor User? @relation(fields: [actorId], references: [id])

  @@index([entity, entityId])
  @@index([actorId])
}
'@

Write-ProjectFile "prisma/seed.ts" @'
// Seed تبلیگرام.
//  - توسعه (پیش‌فرض): ادمین + یک تبلیغ‌کننده و صاحب پیج نمونه، پیج‌ها، بنر و یک کمپین با سفارش و پرداخت مستقیم.
//  - production: فقط ادمین، آن هم فقط اگر ADMIN_MOBILE و ADMIN_PASSWORD در env تنظیم شده باشد. داده/رمز دمو ساخته نمی‌شود.
// اجرا: npx prisma db seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const isProd = process.env.NODE_ENV === "production";
const DEMO_PASSWORD = "Demo@12345";

async function ensureAdmin() {
  const mobile = process.env.ADMIN_MOBILE?.trim() || (isProd ? "" : "09120000000");
  const password = process.env.ADMIN_PASSWORD || (isProd ? "" : "Admin@12345");
  if (!mobile || !password) {
    console.log("seed: ADMIN_MOBILE / ADMIN_PASSWORD تنظیم نشده؛ ادمین ساخته نشد.");
    return null;
  }
  if (!/^09\d{9}$/.test(mobile)) throw new Error("ADMIN_MOBILE باید به شکل 09xxxxxxxxx باشد.");
  if (password.length < 8) throw new Error("ADMIN_PASSWORD باید حداقل ۸ کاراکتر باشد.");
  // update خالی است: رمز ادمینِ موجود هرگز با seed بازنویسی نمی‌شود.
  return prisma.user.upsert({
    where: { mobile },
    update: {},
    create: { mobile, passwordHash: await bcrypt.hash(password, 12), name: "مدیر تبلیگرام", role: "ADMIN", trustScore: 100 },
  });
}

async function seedDemo(adminId: string | null) {
  const pw = await bcrypt.hash(DEMO_PASSWORD, 12);

  const advUser = await prisma.user.upsert({
    where: { mobile: "09121111111" },
    update: {},
    create: {
      mobile: "09121111111", passwordHash: pw, name: "تبلیغ‌کننده نمونه",
      advertiserProfile: { create: { businessName: "مزون آرمان" } },
    },
  });

  const pubUser = await prisma.user.upsert({
    where: { mobile: "09122222222" },
    update: {},
    create: {
      mobile: "09122222222", passwordHash: pw, name: "صاحب پیج نمونه",
      publisherProfile: { create: { payoutCard: "6037-9975-1234-5678", bio: "پیج پوشاک و استایل" } },
    },
  });

  const page = await prisma.instaPage.upsert({
    where: { handle: "@mode_dar_tehran" },
    update: {},
    create: {
      ownerId: pubUser.id, handle: "@mode_dar_tehran", title: "مدِ تهران", category: "fashion", city: "تهران",
      bio: "پوشاک و استایل روزانهٔ زنانه", followers: 182000, avgPostViews: 40000, avgReelsViews: 55000,
      pricePost: 1500000, priceReels: 1800000, status: "APPROVED",
      verification: { create: { status: "VERIFIED", method: "BIO_CODE", verifiedAt: new Date() } },
    },
  });

  const page2 = await prisma.instaPage.upsert({
    where: { handle: "@tech_negar" },
    update: {},
    create: {
      ownerId: pubUser.id, handle: "@tech_negar", title: "تک‌نگار", category: "tech", city: "تهران",
      bio: "اخبار و بررسی گجت‌ها", followers: 240000, avgPostViews: 62000, avgReelsViews: 90000,
      pricePost: 1800000, priceReels: 2200000, status: "PENDING",
    },
  });

  const campaign = await prisma.campaign.upsert({
    where: { orderNumber: "PK-100231" },
    update: {},
    create: {
      orderNumber: "PK-100231", advertiserId: advUser.id, title: "کلکسیون پاییزه کت و پالتو",
      business: "مزون آرمان", description: "کلکسیون جدید با ارسال رایگان.", link: "https://example.com/armaan",
      budget: 6000000, publishType: "post", category: "fashion", city: "تهران", status: "RUNNING",
    },
  });

  const existingOrder = await prisma.order.findFirst({ where: { campaignId: campaign.id, pageId: page.id } });
  if (!existingOrder) {
    await prisma.order.create({
      data: {
        campaignId: campaign.id, pageId: page.id, amount: 1500000, publishType: "post",
        publishAt: new Date(Date.now() + 3 * 864e5), terms: "پست اینستاگرامی + ذکر پیج برند",
        status: "PARTIALLY_PAID",
        payments: {
          create: {
            stage: "STAGE1", amount: 600000, method: "کارت به کارت", reference: "TRX-100231-1",
            status: "CONFIRMED", confirmedAt: new Date(), confirmedByPage: true,
          },
        },
      },
    });
  }

  if ((await prisma.banner.count()) === 0) {
    await prisma.banner.createMany({
      data: [
        {
          title: "تبلیغ در تبلیگرام برای کسب‌وکار شما", description: "یک کمپین، ده‌ها پیج مرتبط.",
          link: "/campaigns/new", placement: "HERO", sortOrder: 1, isActive: true, createdById: adminId,
        },
        {
          title: "به جمع صاحبان پیج بپیوندید", description: "از پیج خودت درآمد بساز.",
          link: "/publisher/dashboard", placement: "HERO", sortOrder: 2, isActive: true, createdById: adminId,
        },
      ],
    });
  }

  console.log(`seed: داده‌های نمونه آماده است — تبلیغ‌کننده 09121111111 و صاحب پیج 09122222222 با رمز ${DEMO_PASSWORD}`);
  console.log("seed: پیج‌ها:", page.handle, page2.handle);
}

async function main() {
  const admin = await ensureAdmin();
  if (admin) console.log("seed: ادمین آماده:", admin.mobile);
  if (isProd) return;
  await seedDemo(admin?.id ?? null);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
'@

Write-ProjectFile ".env.example" @'
# تبلیگرام (Tabligram) — نمونهٔ متغیرهای محیطی.
# این فایل را به .env کپی کن و مقدارها را پر کن. فایل .env هرگز commit نمی‌شود.

# --- دیتابیس ---
# توسعه با SQLite (فایل prisma/dev.db). برای production پیشنهاد می‌شود PostgreSQL.
DATABASE_URL="file:./dev.db"

# --- کلید اصلی برنامه (رمزگذاری توکن‌های اینستاگرام) ---
# حداقل ۳۲ کاراکتر، تصادفی. ساخت:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# هشدار: بعد از ذخیرهٔ توکن‌ها، عوض کردنش آن‌ها را غیرقابل‌خواندن می‌کند.
APP_SECRET=""

# --- ساخت ادمین با seed (اختیاری در توسعه، لازم در production) ---
ADMIN_MOBILE=""
ADMIN_PASSWORD=""

# --- اتصال رسمی اینستاگرام (Meta Graph API) — مرحلهٔ بعد ---
META_APP_ID=""
META_APP_SECRET=""
META_REDIRECT_URI="http://localhost:3000/api/instagram/callback"
'@

Write-Host ""
Write-Host "== 2/4 .gitignore =="
$gi = Join-Path $root ".gitignore"
$giText = ""
if (Test-Path $gi) { $giText = [System.IO.File]::ReadAllText($gi) }
$add = @()
foreach ($line in @("prisma/*.db", "prisma/*.db-journal", ".backup-tabligram-*/")) {
  if ($giText -notmatch ("(?m)^" + [regex]::Escape($line) + "\s*$")) { $add += $line }
}
if ($add.Count -gt 0) {
  $prefix = ""
  if ($giText.Length -gt 0 -and -not $giText.EndsWith("`n")) { $prefix = "`n" }
  [System.IO.File]::AppendAllText($gi, $prefix + ($add -join "`n") + "`n", $utf8)
  Write-Host ("  added: " + ($add -join ", "))
} else { Write-Host "  already ok" }

Write-Host ""
Write-Host "== 3/4 .env (values are never printed) =="
function New-Secret {
  $bytes = New-Object byte[] 48
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($bytes)
  return [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}
function Get-EnvValue([string]$text, [string]$key) {
  $m = [regex]::Match($text, "(?m)^\s*" + $key + "\s*=\s*""?([^""\r\n]*)""?")
  if ($m.Success) { return $m.Groups[1].Value } else { return $null }
}
function Set-EnvValue([string]$text, [string]$key, [string]$value) {
  $line = $key + "=""" + $value + """"
  if ($text -match ("(?m)^\s*" + $key + "\s*=")) {
    return [regex]::Replace($text, "(?m)^\s*" + $key + "\s*=.*$", { param($m) $line })
  }
  if ($text.Length -gt 0 -and -not $text.EndsWith("`n")) { $text += "`n" }
  return $text + $line + "`n"
}
$envPath = Join-Path $root ".env"
if (-not (Test-Path $envPath)) {
  $t = "DATABASE_URL=""file:./dev.db""`nAPP_SECRET=""" + (New-Secret) + """`n"
  [System.IO.File]::WriteAllText($envPath, $t, $utf8)
  Write-Host "  .env did not exist -> created with DATABASE_URL and a fresh random APP_SECRET"
} else {
  $t = [System.IO.File]::ReadAllText($envPath)
  $changed = $false
  $db = Get-EnvValue $t "DATABASE_URL"
  if ([string]::IsNullOrWhiteSpace($db)) {
    $t = Set-EnvValue $t "DATABASE_URL" "file:./dev.db"; $changed = $true
    Write-Host "  DATABASE_URL was missing/empty -> set to file:./dev.db"
  } else { Write-Host "  DATABASE_URL: present" }
  $sec = Get-EnvValue $t "APP_SECRET"
  if ([string]::IsNullOrWhiteSpace($sec)) {
    $t = Set-EnvValue $t "APP_SECRET" (New-Secret); $changed = $true
    Write-Host "  APP_SECRET was missing/empty -> generated a random one"
  } elseif ($sec.Length -lt 32) {
    Write-Host ("  WARNING: APP_SECRET is only " + $sec.Length + " chars; production needs 32+. Not changed.") -ForegroundColor Yellow
  } else { Write-Host ("  APP_SECRET: present (" + $sec.Length + " chars)") }
  if ($changed) { [System.IO.File]::WriteAllText($envPath, $t, $utf8) }
}

Write-Host ""
Write-Host "== 4/4 leftovers that still need attention (read-only scan) =="
$patterns = @(
  @{ n = "old role checks";          p = 'requireRole\(|PUBLIC_ROLES|PublicRoleId|"ADVERTISER"|"PUBLISHER"' },
  @{ n = "old cookie name";          p = 'Tabligram_session' },
  @{ n = "APP_SECRET imported";      p = 'import .*APP_SECRET' },
  @{ n = "isMobile from validation"; p = 'isMobile.*@/lib/validation' },
  @{ n = "escrow / held funds";      p = '[Ee]scrow' },
  @{ n = "old brand name";           p = 'Tabligram|Tabligram|تبلیگرام|تبلیگرام' }
)
$scanFiles = @()
foreach ($d in @("app", "components", "lib", "prisma")) {
  $p = Join-Path $root $d
  if (Test-Path $p) {
    $scanFiles += Get-ChildItem -Path $p -Recurse -File | Where-Object { ($_.Extension -in ".ts", ".tsx", ".prisma") -and ($_.FullName -notmatch "\\migrations\\") }
  }
}
foreach ($pat in $patterns) {
  $hits = @()
  foreach ($f in $scanFiles) { $hits += Select-String -Path $f.FullName -Pattern $pat.p }
  Write-Host ("  [" + $pat.n + "] " + $hits.Count + " match(es)")
  foreach ($h in ($hits | Select-Object -First 12)) {
    $rel = $h.Path.Substring($root.Length + 1)
    $txt = $h.Line.Trim(); if ($txt.Length -gt 110) { $txt = $txt.Substring(0, 110) }
    Write-Host ("      " + $rel + ":" + $h.LineNumber + "  " + $txt)
  }
}

Write-Host ""
Write-Host ("DONE: " + $script:written + " files written, " + $script:backedUp + " originals backed up.") -ForegroundColor Green
Write-Host "Next (run these one by one):"
Write-Host "  npm rm @types/bcryptjs"
Write-Host "  npm pkg set name=tabligram scripts.postinstall=""prisma generate"""
Write-Host "  npx prisma migrate dev --name unify_user_role"
Write-Host "  npx prisma migrate reset --force      # wipes DEV data only, re-applies migrations, runs seed"
Write-Host "  npm run typecheck"
