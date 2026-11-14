// فقط سمت سرور. ابزارهای مشترک route ها.
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { HttpError, type SessionUser } from "@/lib/auth";
import { PAGE_PUBLISH_TYPES, type PagePublishType } from "@/lib/page-rules";
import type { Viewer } from "@/lib/visibility-rules";

export const ID_RE = /^[A-Za-z0-9_-]{10,40}$/;
export const MAX_PAGES_PER_OWNER = 5;

export const notFound = (message = "پیدا نشد.") => NextResponse.json({ error: message }, { status: 404 });

/** پاسخ ۴۰۰ با خطای هر فیلد: { error, fields } */
export const invalid = (errors: Record<string, string | undefined>) =>
  NextResponse.json({ error: Object.values(errors).find(Boolean) ?? "ورودی نامعتبر است.", fields: errors }, { status: 400 });

/** استثنای ۴۰۹ (داخل transaction باعث برگشت همه تغییرها می‌شود). */
export const conflict = (message: string): never => {
  throw new HttpError(409, message);
};

export const isUniqueViolation = (e: unknown): boolean =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
export const isForeignKeyViolation = (e: unknown): boolean =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003";

export const viewerOf = (u: SessionUser): Viewer => ({ userId: u.id, isAdmin: u.isAdmin });
/** بیننده‌ای که همیشه نمای «عمومی» می‌گیرد (حتی اگر ادمین باشد)؛ برای بازار تبلیغ‌دهنده. */
export const marketViewerOf = (u: SessionUser): Viewer => ({ userId: u.id, isAdmin: false });

export const isPublishType = (v: unknown): v is PagePublishType =>
  typeof v === "string" && (PAGE_PUBLISH_TYPES as readonly string[]).includes(v);

/** شکل سفارش برای ماشین حالت money-rules */
export const orderForRules = (o: {
  status: string;
  publishType: string;
  respondByAt: Date | null;
  publishDeadlineAt: Date | null;
  proofSubmittedAt: Date | null;
}) => ({
  status: o.status,
  publishType: o.publishType as PagePublishType,
  respondByAt: o.respondByAt,
  publishDeadlineAt: o.publishDeadlineAt,
  proofSubmittedAt: o.proofSubmittedAt,
});

/** آدرس http(s) معتبر با سقف طول؛ برای لینک مدرک‌ها. */
export function isHttpLink(value: unknown, max = 500): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > max) return false;
  try {
    const u = new URL(value);
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}