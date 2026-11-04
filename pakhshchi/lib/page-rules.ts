// قوانین خالص (pure) پیج‌ها: اعتبارسنجی، نرمال‌سازی، تشخیص تغییر مؤثر و گذار وضعیت‌ها.
// هیچ import سمت‌سروری ندارد. API سرور همیشه این قوانین را اجرا می‌کند؛ UI فقط برای راهنمایی کاربر است.
// نسخهٔ ۲: استوری، پست و ریلز هر سه نوع انتشار واقعی هستند.
import { isCategoryId } from "@/lib/categories";
import { toLatinDigits } from "@/lib/utils";
import type { CategoryId } from "@/types";

export const PAGE_PUBLISH_TYPES = ["story", "post", "reels"] as const;
export type PagePublishType = (typeof PAGE_PUBLISH_TYPES)[number];
export type PageStatusValue = "PENDING" | "APPROVED" | "REJECTED" | "DISABLED";

export const LIMITS = {
  minFollowers: 100,
  maxCount: 100_000_000,
  minPrice: 50_000,
  maxPrice: 1_000_000_000,
  minTitle: 2,
  maxTitle: 50,
  maxCity: 40,
  maxBio: 300,
  minRejectReason: 5,
  maxRejectReason: 300,
} as const;

/** دادهٔ نرمال‌شدهٔ پیج؛ قیمتِ نوع انتشارِ انتخاب‌نشده همیشه ۰ است. */
export interface PageData {
  handle: string;
  title: string;
  category: CategoryId;
  city: string;
  bio: string;
  followers: number;
  avgStoryViews: number;
  avgPostViews: number;
  avgReelsViews: number;
  priceStory: number;
  pricePost: number;
  priceReels: number;
}

export type PageField = keyof PageData | "publishTypes";
export type PageErrors = Partial<Record<PageField, string>>;
export type ParseResult = { ok: true; data: PageData } | { ok: false; errors: PageErrors };

type Prices = { priceStory: number; pricePost: number; priceReels: number };

const collapse = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
const isEmpty = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

/** عدد صحیح نامنفی از number یا رشته (ارقام فارسی/عربی و جداکننده‌ها مجازند)؛ در غیر این صورت null. */
function toInt(v: unknown): number | null {
  if (typeof v === "number") return Number.isInteger(v) && v >= 0 ? v : null;
  if (typeof v !== "string") return null;
  const t = toLatinDigits(v).replace(/[\s,\u066C\u060C]/g, "");
  return /^\d+$/.test(t) ? Number(t) : null;
}

/** آیدی با @ و حروف کوچک؛ ارقام فارسی لاتین می‌شوند. */
export function normalizeHandleValue(input: string): string {
  return `@${toLatinDigits(input).trim().toLowerCase().replace(/^@+/, "")}`;
}

export function isValidHandle(handle: string): boolean {
  if (!/^@[a-z0-9._]{3,30}$/.test(handle)) return false;
  const name = handle.slice(1);
  return !name.startsWith(".") && !name.endsWith(".") && !name.includes("..");
}

/** تعرفهٔ یک نوع انتشار؛ ۰ یعنی پیج آن را ارائه نمی‌دهد. */
export const priceForType = (p: Prices, type: PagePublishType): number =>
  type === "story" ? p.priceStory : type === "post" ? p.pricePost : p.priceReels;

/** نوع‌هایی که پیج ارائه می‌دهد (تعرفهٔ بزرگ‌تر از صفر). ترتیب ثابت: استوری، پست، ریلز. */
export const offeredTypes = (p: Prices): PagePublishType[] =>
  PAGE_PUBLISH_TYPES.filter((t) => priceForType(p, t) > 0);

export function parsePageInput(raw: Record<string, unknown>): ParseResult {
  const errors: PageErrors = {};

  const handle = normalizeHandleValue(typeof raw.handle === "string" ? raw.handle : "");
  if (!isValidHandle(handle)) errors.handle = "آیدی اینستاگرام معتبر نیست؛ فقط حروف انگلیسی، عدد، نقطه و زیرخط (۳ تا ۳۰ کاراکتر).";

  let title = collapse(raw.title);
  if (!title) title = handle;
  else if (title.length < LIMITS.minTitle || title.length > LIMITS.maxTitle) {
    errors.title = `نام نمایشی باید بین ${LIMITS.minTitle} تا ${LIMITS.maxTitle} حرف باشد.`;
  }

  const categoryRaw = typeof raw.category === "string" ? raw.category : "";
  const category = isCategoryId(categoryRaw) ? categoryRaw : null;
  if (category === null) errors.category = "دسته‌بندی را انتخاب کنید.";

  const city = collapse(raw.city);
  if (city.length > LIMITS.maxCity) errors.city = `شهر حداکثر ${LIMITS.maxCity} حرف باشد.`;

  const bio = typeof raw.bio === "string" ? raw.bio.trim() : "";
  if (bio.length > LIMITS.maxBio) errors.bio = `معرفی پیج حداکثر ${LIMITS.maxBio} حرف باشد.`;

  const followers = toInt(raw.followers);
  if (followers === null) errors.followers = "تعداد فالوئر را به‌صورت عدد وارد کنید.";
  else if (followers < LIMITS.minFollowers) errors.followers = `تعداد فالوئر باید حداقل ${LIMITS.minFollowers} باشد.`;
  else if (followers > LIMITS.maxCount) errors.followers = "تعداد فالوئر معتبر نیست.";

  const views = (key: "avgStoryViews" | "avgPostViews" | "avgReelsViews") => {
    if (isEmpty(raw[key])) return 0;
    const n = toInt(raw[key]);
    if (n === null || n > LIMITS.maxCount) {
      errors[key] = "میانگین بازدید باید عدد صحیح معتبر باشد.";
      return 0;
    }
    return n;
  };
  const avgStoryViews = views("avgStoryViews");
  const avgPostViews = views("avgPostViews");
  const avgReelsViews = views("avgReelsViews");

  const types = new Set<PagePublishType>();
  if (Array.isArray(raw.publishTypes)) {
    for (const t of raw.publishTypes) {
      if ((PAGE_PUBLISH_TYPES as readonly unknown[]).includes(t)) types.add(t as PagePublishType);
    }
  }
  if (types.size === 0) errors.publishTypes = "حداقل یک نوع انتشار (استوری، پست یا ریلز) را انتخاب کنید.";

  const price = (type: PagePublishType, key: "priceStory" | "pricePost" | "priceReels") => {
    if (!types.has(type)) return 0;
    const n = toInt(raw[key]);
    if (n === null || n < LIMITS.minPrice || n > LIMITS.maxPrice) {
      errors[key] = `تعرفه باید عددی بین ${LIMITS.minPrice.toLocaleString("en-US")} و ${LIMITS.maxPrice.toLocaleString("en-US")} تومان باشد.`;
      return 0;
    }
    return n;
  };
  const priceStory = price("story", "priceStory");
  const pricePost = price("post", "pricePost");
  const priceReels = price("reels", "priceReels");

  if (Object.keys(errors).length > 0 || category === null || followers === null) return { ok: false, errors };
  return {
    ok: true,
    data: {
      handle, title, category, city, bio, followers,
      avgStoryViews, avgPostViews, avgReelsViews,
      priceStory, pricePost, priceReels,
    },
  };
}

/** آیا ویرایش «مؤثر» است؟ (هر تغییر در دادهٔ نرمال‌شده یا تصویر). ذخیرهٔ بدون تغییر اثری ندارد. */
export function hasEffectiveChange(before: PageData, after: PageData, opts: { avatarChanged?: boolean } = {}): boolean {
  if (opts.avatarChanged) return true;
  return (Object.keys(before) as (keyof PageData)[]).some((k) => before[k] !== after[k]);
}

export type OwnerEditResult =
  | { ok: true; status: PageStatusValue; resubmitted: boolean }
  | { ok: false; error: string };

/** وضعیت پس از ویرایش ناشر. پیج غیرفعال‌شده توسط مدیر قابل ویرایش نیست (جلوگیری از دور زدن). */
export function statusAfterOwnerEdit(current: PageStatusValue, changed: boolean): OwnerEditResult {
  if (current === "DISABLED") return { ok: false, error: "این پیج توسط مدیر غیرفعال شده و قابل ویرایش نیست." };
  if (!changed) return { ok: true, status: current, resubmitted: false };
  return { ok: true, status: "PENDING", resubmitted: true };
}

export type AdminAction = "approve" | "reject" | "disable" | "restore";

const TRANSITIONS: Record<AdminAction, { from: PageStatusValue[]; to: PageStatusValue }> = {
  approve: { from: ["PENDING", "REJECTED"], to: "APPROVED" },
  reject: { from: ["PENDING", "APPROVED"], to: "REJECTED" },
  disable: { from: ["APPROVED"], to: "DISABLED" },
  restore: { from: ["DISABLED"], to: "APPROVED" },
};

/** وضعیت بعدی؛ اگر گذار مجاز نباشد null. */
export function adminTransition(current: PageStatusValue, action: AdminAction): PageStatusValue | null {
  const t = TRANSITIONS[action];
  return t.from.includes(current) ? t.to : null;
}

export function parseRejectReason(raw: unknown): { ok: true; reason: string } | { ok: false; error: string } {
  const reason = collapse(raw);
  if (reason.length < LIMITS.minRejectReason) return { ok: false, error: `دلیل رد الزامی است (حداقل ${LIMITS.minRejectReason} حرف).` };
  if (reason.length > LIMITS.maxRejectReason) return { ok: false, error: `دلیل رد حداکثر ${LIMITS.maxRejectReason} حرف باشد.` };
  return { ok: true, reason };
}

/** اگر ناشر بعد از دیدن مدیر ویرایش کرده باشد، تصمیم مدیر باید با خطای ۴۰۹ رد شود. */
export function isStale(seenUpdatedAt: unknown, currentUpdatedAt: Date): boolean {
  if (typeof seenUpdatedAt !== "string") return true;
  const seen = new Date(seenUpdatedAt).getTime();
  return Number.isNaN(seen) || seen !== currentUpdatedAt.getTime();
}

export interface PublicPageSource extends Prices {
  id: string;
  category: string;
  city: string | null;
  followers: number;
  avgStoryViews: number;
  avgPostViews: number;
  avgReelsViews: number;
}
export interface PublicPage extends PublicPageSource {
  offeredTypes: PagePublishType[];
}

/** نمای عمومی بازار: فقط این فیلدها (انتخاب صریح)؛ آیدی، لینک، عکس، نام، بیو و ownerId هرگز. */
export function toPublicPage(p: PublicPageSource): PublicPage {
  return {
    id: p.id,
    category: p.category,
    city: p.city,
    followers: p.followers,
    avgStoryViews: p.avgStoryViews,
    avgPostViews: p.avgPostViews,
    avgReelsViews: p.avgReelsViews,
    priceStory: p.priceStory,
    pricePost: p.pricePost,
    priceReels: p.priceReels,
    offeredTypes: offeredTypes(p),
  };
}