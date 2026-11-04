// قوانین خالص «چه کسی چه چیزی را می‌بیند».
// قانون اصلی: تا قبل از پذیرش درخواست توسط صاحب پیج (revealedAt)، آیدی و لینک پیج، لینک و نام کسب‌وکار
// تبلیغ‌دهنده، و هر راه تماس دیگر از دو طرف مخفی است. مدیر همیشه همه‌چیز را می‌بیند.
// API باید پاسخ‌ها را فقط از مسیر این توابع بسازد؛ هرگز مستقیم رکورد Prisma را برنگرداند.
import { maskCard } from "@/lib/identity-rules";
import { toPublicPage, type PublicPage } from "@/lib/page-rules";
import { toLatinDigits } from "@/lib/utils";

export interface Viewer {
  userId: string | null;
  isAdmin: boolean;
}

/** هویت دو طرف از لحظهٔ پذیرش آشکار است و بعد از آن (حتی اگر سفارش لغو یا مختومه شود) آشکار می‌ماند. */
export const isRevealed = (order: { revealedAt: Date | null }): boolean => order.revealedAt !== null;

/* ------------------------------------------------------------------ */
/* پیج                                                                  */
/* ------------------------------------------------------------------ */

export interface FullPage {
  id: string;
  ownerId: string;
  handle: string;
  title: string;
  category: string;
  city: string | null;
  bio: string | null;
  followers: number;
  avgStoryViews: number;
  avgPostViews: number;
  avgReelsViews: number;
  priceStory: number;
  pricePost: number;
  priceReels: number;
  avatarUrl: string | null;
  status: string;
  rejectReason: string | null;
}

export interface PageIdentity {
  handle: string;
  instagramUrl: string;
  title: string;
  bio: string | null;
  avatarUrl: string | null;
}

export type PageView =
  | ({ level: "public" } & PublicPage)
  | ({ level: "revealed" } & PublicPage & PageIdentity)
  | ({ level: "owner" } & PublicPage & PageIdentity & { status: string; rejectReason: string | null })
  | ({ level: "admin" } & PublicPage & PageIdentity & { status: string; rejectReason: string | null; ownerId: string });

/**
 * شکل پیج برای هر بیننده.
 * revealed = «بیننده تبلیغ‌دهنده‌ای است که برای این پیج سفارش پذیرفته‌شده دارد».
 * خروجی همیشه با انتخاب صریح فیلدها ساخته می‌شود، پس فیلد جدیدِ رکورد خودکار فاش نمی‌شود.
 */
export function shapePage(page: FullPage, viewer: Viewer, revealed = false): PageView {
  const pub = toPublicPage(page);
  const identity: PageIdentity = {
    handle: page.handle,
    instagramUrl: `https://instagram.com/${page.handle.replace(/^@/, "")}`,
    title: page.title,
    bio: page.bio,
    avatarUrl: page.avatarUrl,
  };
  if (viewer.isAdmin) {
    return { level: "admin", ...pub, ...identity, status: page.status, rejectReason: page.rejectReason, ownerId: page.ownerId };
  }
  if (viewer.userId !== null && viewer.userId === page.ownerId) {
    return { level: "owner", ...pub, ...identity, status: page.status, rejectReason: page.rejectReason };
  }
  if (revealed) return { level: "revealed", ...pub, ...identity };
  return { level: "public", ...pub };
}

/* ------------------------------------------------------------------ */
/* کمپین                                                                */
/* ------------------------------------------------------------------ */

export interface FullCampaign {
  id: string;
  advertiserId: string;
  title: string;
  business: string;
  description: string;
  link: string;
  mediaUrl: string | null;
  mediaKind: string | null;
  budget: number;
  category: string | null;
  city: string | null;
  notes: string | null;
  publishTypes: string[];
}

export interface CampaignForOwnerPublic {
  id: string;
  title: string;
  description: string;
  mediaUrl: string | null;
  mediaKind: string | null;
  category: string | null;
  city: string | null;
  notes: string | null;
  publishTypes: string[];
}
export type CampaignForOwner = CampaignForOwnerPublic & { revealed: false } | (CampaignForOwnerPublic & { revealed: true; business: string; link: string });

/** شکل کمپین برای صاحب پیج: قبل از پذیرش بدون نام کسب‌وکار و لینک؛ بودجهٔ کل و شناسهٔ تبلیغ‌دهنده هرگز. */
export function shapeCampaignForPageOwner(c: FullCampaign, revealed: boolean): CampaignForOwner {
  const base: CampaignForOwnerPublic = {
    id: c.id,
    title: c.title,
    description: c.description,
    mediaUrl: c.mediaUrl,
    mediaKind: c.mediaKind,
    category: c.category,
    city: c.city,
    notes: c.notes,
    publishTypes: c.publishTypes,
  };
  return revealed ? { ...base, revealed: true, business: c.business, link: c.link } : { ...base, revealed: false };
}

/* ------------------------------------------------------------------ */
/* تشخیص راه تماس داخل متن‌های آزاد                                      */
/* ------------------------------------------------------------------ */

export type ContactLeakKind = "email" | "handle" | "url" | "phone" | "messenger";

/**
 * متن‌های آزادی که قبل از پذیرش دیده می‌شوند (عنوان، توضیحات و یادداشت کمپین) نباید راه تماس داشته باشند.
 * این فقط یک سد ساده است: عکس، متن شکسته‌شده یا حروف جداشده را نمی‌گیرد؛ بررسی مدیر لازم می‌ماند.
 */
export function findContactLeaks(text: string): ContactLeakKind[] {
  const t = toLatinDigits(text);
  const found = new Set<ContactLeakKind>();

  if (/[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(t)) found.add("email");
  if (/(^|[^a-z0-9._])@[a-z0-9._]{3,}/i.test(t)) found.add("handle");
  if (/(https?:\/\/|www\.)\S+/i.test(t) || /\b[a-z0-9-]{2,}\.(com|ir|net|org|io|co|me|app|shop|store|info|xyz|site|online|ly)\b/i.test(t)) {
    found.add("url");
  }
  if (/(?:\+?98|0)?[\s\-().]*9(?:[\s\-().]*\d){9}/.test(t)) found.add("phone");
  if (/(t\.me|telegram|whatsapp|wa\.me|eitaa|rubika)/i.test(t) || /(\u062A\u0644\u06AF\u0631\u0627\u0645|\u0648\u0627\u062A\u0633\s?\u0627\u067E|\u0627\u06CC\u062A\u0627|\u0631\u0648\u0628\u06CC\u06A9\u0627)/.test(t)) {
    found.add("messenger");
  }
  return [...found];
}

/** خطاهای فارسی برای فیلدهایی که راه تماس دارند؛ خالی یعنی مشکلی نیست. */
export function contactLeakErrors(fields: Record<string, string | null | undefined>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [name, value] of Object.entries(fields)) {
    if (value && findContactLeaks(value).length > 0) {
      errors[name] = "در این بخش لینک، آیدی، شمارهٔ تماس یا نام پیام‌رسان ننویسید؛ آن‌ها فقط بعد از پذیرش درخواست به طرف مقابل نشان داده می‌شوند.";
    }
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* اطلاعات پرداخت صاحب پیج                                               */
/* ------------------------------------------------------------------ */

export interface PayoutProfileFull {
  firstName: string | null;
  lastName: string | null;
  cardLast4: string | null;
  payoutStatus: string;
  payoutRejectReason: string | null;
}

export interface PayoutProfileView {
  firstName: string | null;
  lastName: string | null;
  maskedCard: string | null;
  status: string;
  rejectReason: string | null;
  /** فقط برای مدیر و فقط وقتی API رمزگشایی‌شده را داده باشد */
  cardNumber?: string;
  nationalId?: string;
}

/**
 * صاحب پیج فقط نام و ۴ رقم آخر کارت خودش را می‌بیند؛ مدیر در صورت دادن مقدارهای رمزگشایی‌شده
 * کارت و کد ملی را هم می‌بیند؛ بقیه هیچ‌چیز. شمارهٔ کارت و کد ملی هرگز به صاحب پیج برنمی‌گردد.
 */
export function shapePayoutProfile(
  p: PayoutProfileFull,
  ownerId: string,
  viewer: Viewer,
  secrets: { cardNumber?: string; nationalId?: string } = {},
): PayoutProfileView | null {
  const isOwner = viewer.userId !== null && viewer.userId === ownerId;
  if (!viewer.isAdmin && !isOwner) return null;
  const view: PayoutProfileView = {
    firstName: p.firstName,
    lastName: p.lastName,
    maskedCard: p.cardLast4 ? maskCard(p.cardLast4) : null,
    status: p.payoutStatus,
    rejectReason: p.payoutRejectReason,
  };
  if (viewer.isAdmin) {
    if (secrets.cardNumber) view.cardNumber = secrets.cardNumber;
    if (secrets.nationalId) view.nationalId = secrets.nationalId;
  }
  return view;
}