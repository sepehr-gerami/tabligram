// قوانین خالص بنر صفحهٔ اول: اعتبارسنجی ورودی مدیر، بازهٔ نمایش و شکل عمومی.
// هیچ import سمت‌سروری ندارد. API همیشه این قوانین را اجرا می‌کند.
import { storedBannerName } from "@/lib/image-rules";
import { isHttpUrl } from "@/lib/utils";

export const BANNER_PLACEMENTS = ["HERO", "SIDEBAR", "FOOTER", "PAGES_TOP"] as const;
export type BannerPlacementValue = (typeof BANNER_PLACEMENTS)[number];

export const BANNER_LIMITS = {
  minTitle: 2,
  maxTitle: 80,
  maxDescription: 200,
  maxLink: 500,
  maxSortOrder: 9999,
} as const;

export interface BannerData {
  title: string;
  description: string | null;
  link: string;
  desktopImage: string | null;
  mobileImage: string | null;
  placement: BannerPlacementValue;
  sortOrder: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}
export type BannerField = keyof BannerData;
export type BannerErrors = Partial<Record<BannerField, string>>;

/** لینک مجاز: مسیر داخلی سایت (فقط با یک /) یا آدرس http/https. javascript: و //host مجاز نیست. */
export function isSafeLink(link: string): boolean {
  if (link.length === 0 || link.length > BANNER_LIMITS.maxLink) return false;
  if (/^\/(?![\/\\])[^\s\\]*$/.test(link)) return true;
  return isHttpUrl(link);
}

const collapse = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

function parseDate(v: unknown): Date | null | undefined {
  // undefined = نامعتبر، null = خالی
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string") return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const has = (raw: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(raw, k);

/**
 * اعتبارسنجی مشترک. partial=true یعنی فقط فیلدهای موجود در raw بررسی می‌شوند (برای PATCH)،
 * وگرنه همهٔ فیلدهای الزامی لازم‌اند و بقیه مقدار پیش‌فرض می‌گیرند.
 */
function validate(raw: Record<string, unknown>, partial: boolean): { data: Partial<BannerData>; errors: BannerErrors } {
  const data: Partial<BannerData> = {};
  const errors: BannerErrors = {};
  const want = (k: BannerField) => !partial || has(raw, k);

  if (want("title")) {
    const t = collapse(raw.title);
    if (t.length < BANNER_LIMITS.minTitle || t.length > BANNER_LIMITS.maxTitle) {
      errors.title = `عنوان باید بین ${BANNER_LIMITS.minTitle} تا ${BANNER_LIMITS.maxTitle} حرف باشد.`;
    } else data.title = t;
  }

  if (want("description")) {
    const d = typeof raw.description === "string" ? raw.description.trim() : "";
    if (d.length > BANNER_LIMITS.maxDescription) errors.description = `توضیح حداکثر ${BANNER_LIMITS.maxDescription} حرف باشد.`;
    else data.description = d === "" ? null : d;
  }

  if (want("link")) {
    const l = typeof raw.link === "string" ? raw.link.trim() : "";
    if (!isSafeLink(l)) errors.link = "لینک باید آدرس کامل https یا مسیر داخلی سایت (مثل /campaigns/new) باشد.";
    else data.link = l;
  }

  for (const key of ["desktopImage", "mobileImage"] as const) {
    if (!want(key)) continue;
    const v = raw[key];
    if (v === null || v === undefined || v === "") data[key] = null;
    else if (typeof v === "string" && storedBannerName(v) !== null) data[key] = v;
    else errors[key] = "تصویر باید از همین پنل آپلود شده باشد.";
  }

  if (want("placement")) {
    const p = raw.placement;
    if ((BANNER_PLACEMENTS as readonly unknown[]).includes(p)) data.placement = p as BannerPlacementValue;
    else if (!partial && (p === undefined || p === null || p === "")) data.placement = "HERO";
    else errors.placement = "جایگاه بنر معتبر نیست.";
  }

  if (want("sortOrder")) {
    const v = raw.sortOrder;
    if (!partial && (v === undefined || v === null || v === "")) data.sortOrder = 0;
    else {
      const n = typeof v === "number" ? v : typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN;
      if (!Number.isInteger(n) || n < 0 || n > BANNER_LIMITS.maxSortOrder) errors.sortOrder = `ترتیب باید عددی بین ۰ تا ${BANNER_LIMITS.maxSortOrder} باشد.`;
      else data.sortOrder = n;
    }
  }

  if (want("isActive")) {
    if (typeof raw.isActive === "boolean") data.isActive = raw.isActive;
    else if (!partial && raw.isActive === undefined) data.isActive = true;
    else errors.isActive = "وضعیت فعال بودن باید درست یا نادرست باشد.";
  }

  for (const key of ["startsAt", "endsAt"] as const) {
    if (!want(key)) continue;
    const d = parseDate(raw[key]);
    if (d === undefined) errors[key] = "تاریخ معتبر نیست.";
    else data[key] = d;
  }

  const window = checkBannerWindow(data.startsAt ?? null, data.endsAt ?? null);
  if (window) errors.endsAt = window;

  return { data, errors };
}

/** پایان باید بعد از شروع باشد؛ پیام خطا یا null. */
export function checkBannerWindow(startsAt: Date | null, endsAt: Date | null): string | null {
  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) return "زمان پایان باید بعد از زمان شروع باشد.";
  return null;
}

export type BannerParse = { ok: true; data: BannerData } | { ok: false; errors: BannerErrors };
export type BannerPatchParse = { ok: true; data: Partial<BannerData> } | { ok: false; errors: BannerErrors };

/** ساخت بنر جدید: عنوان و لینک الزامی‌اند. */
export function parseBannerInput(raw: Record<string, unknown>): BannerParse {
  const { data, errors } = validate(raw, false);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: data as BannerData };
}

/** ویرایش جزئی: فقط فیلدهای فرستاده‌شده تغییر می‌کنند؛ بدنهٔ خالی خطاست. */
export function parseBannerPatch(raw: Record<string, unknown>): BannerPatchParse {
  const { data, errors } = validate(raw, true);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  if (Object.keys(data).length === 0) return { ok: false, errors: { title: "هیچ فیلدی برای ویرایش فرستاده نشده است." } };
  return { ok: true, data };
}

/** آیا بنر الان باید نمایش داده شود؟ */
export function isBannerLive(b: { isActive: boolean; startsAt: Date | null; endsAt: Date | null }, now: Date): boolean {
  if (!b.isActive) return false;
  if (b.startsAt && b.startsAt.getTime() > now.getTime()) return false;
  if (b.endsAt && b.endsAt.getTime() <= now.getTime()) return false;
  return true;
}

export interface PublicBannerSource {
  id: string;
  title: string;
  description: string | null;
  link: string;
  desktopImage: string | null;
  mobileImage: string | null;
  placement: string;
  sortOrder: number;
}

/** شکل عمومی بنر (انتخاب صریح فیلدها)؛ شناسهٔ سازنده، زمان‌ها و وضعیت داخلی هرگز. */
export function publicBanner(b: PublicBannerSource) {
  return {
    id: b.id,
    title: b.title,
    description: b.description,
    link: b.link,
    desktopImage: b.desktopImage,
    mobileImage: b.mobileImage,
    placement: b.placement,
    sortOrder: b.sortOrder,
  };
}