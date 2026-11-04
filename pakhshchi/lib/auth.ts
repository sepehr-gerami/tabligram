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
// این تابع کاربر لاگین شده رو برمی‌گردونه یا ارور میده
export async function requireAuth() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) throw new Error("UNAUTHORIZED");

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });

  if (!session || session.expiresAt < new Date()) {
    throw new Error("UNAUTHORIZED");
  }
  
  if (session.user.status !== "ACTIVE") {
    throw new Error("FORBIDDEN");
  }

  return session.user;
}