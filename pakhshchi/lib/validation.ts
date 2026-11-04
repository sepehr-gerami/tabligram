import type { CategoryId, PublishType } from "@/types";
import { isCategoryId } from "@/lib/categories";
import { ACCEPTED_IMAGES, ACCEPTED_MEDIA, MAX_AVATAR_MB, MAX_FILE_MB, MIN_BUDGET, PUBLISH_TYPES } from "@/lib/constants";
import { formatNumber, isHandle, isHttpUrl, parseAmount, toLatinDigits } from "@/lib/utils";

export type Errors<K extends string> = Partial<Record<K, string>>;

export interface CampaignValues {
  title: string; business: string; description: string; link: string;
  budget: string; count: string; publishType: PublishType | ""; category: CategoryId | "";
  region: string; notes: string;
}
export type CampaignField = keyof CampaignValues | "media";

export function validateMedia(file: File | null): string | undefined {
  if (!file) return "تصویر یا ویدئوی تبلیغ را انتخاب کنید.";
  if (!ACCEPTED_MEDIA.includes(file.type)) return "فرمت فایل مجاز نیست. فقط JPG، PNG، WebP یا MP4 بارگذاری کنید.";
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `حجم فایل بیشتر از ${formatNumber(MAX_FILE_MB)} مگابایت است.`;
  return undefined;
}

export function validateCampaign(v: CampaignValues, file: File | null): Errors<CampaignField> {
  const e: Errors<CampaignField> = {};
  if (v.title.trim().length < 3) e.title = "عنوان تبلیغ را وارد کنید (حداقل ۳ حرف).";
  if (!v.business.trim()) e.business = "نام کسب‌وکار را وارد کنید.";
  if (v.description.trim().length < 15) e.description = "توضیحات را کامل‌تر بنویسید (حداقل ۱۵ حرف).";
  const link = toLatinDigits(v.link.trim());
  if (!link) e.link = "لینک پیج اینستاگرام یا سایت را وارد کنید.";
  else if (!isHttpUrl(link) && !isHandle(link)) e.link = "لینک معتبر نیست. نمونه: https://example.com یا @username";
  const media = validateMedia(file);
  if (media) e.media = media;
  const budget = parseAmount(v.budget);
  if (!v.budget.trim()) e.budget = "بودجهٔ کل را به تومان وارد کنید.";
  else if (budget < MIN_BUDGET) e.budget = `حداقل بودجه ${formatNumber(MIN_BUDGET)} تومان است.`;
  const count = Number(toLatinDigits(v.count.trim()));
  if (!v.count.trim()) e.count = "تعداد انتشار را وارد کنید.";
  else if (!Number.isInteger(count) || count < 1 || count > 100) e.count = "تعداد انتشار باید عددی بین ۱ تا ۱۰۰ باشد.";
  if (!v.publishType) e.publishType = "نوع انتشار را انتخاب کنید.";
  // The category is optional: it is only rejected when the value is not one of the known ids.
  if (v.category && !isCategoryId(v.category)) e.category = "دسته‌بندی انتخاب‌شده معتبر نیست.";
  if (v.notes.length > 500) e.notes = "توضیحات تکمیلی حداکثر ۵۰۰ حرف باشد.";
  return e;
}

export interface PageValues {
  title: string; handle: string; url: string; category: CategoryId | ""; city: string; bio: string;
  followers: string; avgStoryViews: string; avgPostViews: string;
  prices: Record<PublishType, string>; publishTypes: PublishType[];
}
export type PageField = keyof PageValues | `price_${PublishType}`;

/** Non-negative integer, Persian/Latin digits, separators allowed. */
const parseCount = (s: string) => parseAmount(s);

/** A value is a non-negative integer amount (empty → 0). */
const isCountOk = (s: string) => /^[\d\s٬,]*$/.test(toLatinDigits(s)) && parseCount(s) >= 0;

export function validatePage(v: PageValues): Errors<PageField> {
  const e: Errors<PageField> = {};
  if (v.title.trim().length > 0 && v.title.trim().length < 2) e.title = "نام نمایشی پیج دست‌کم ۲ حرف باشد.";
  if (v.title.trim().length > 50) e.title = "نام نمایشی حداکثر ۵۰ حرف باشد.";
  if (!isHandle(toLatinDigits(v.handle.trim()))) e.handle = "شناسهٔ پیج معتبر نیست. فقط حروف انگلیسی، عدد، نقطه و زیرخط (۳ تا ۳۰ کاراکتر).";
  const url = v.url.trim();
  if (!url) e.url = "لینک پیج را وارد کنید.";
  else if (!isHttpUrl(url) || !/(^|\.)instagram\.com$/.test(new URL(url).hostname)) e.url = "لینک باید آدرس پیج در اینستاگرام باشد؛ مثل https://instagram.com/username";
  // Category is optional; only an unknown id is an error.
  if (v.category && !isCategoryId(v.category)) e.category = "دسته‌بندی انتخاب‌شده معتبر نیست.";
  if (v.city.trim().length > 40) e.city = "شهر حداکثر ۴۰ حرف باشد.";
  if (v.bio.length > 300) e.bio = "معرفی پیج حداکثر ۳۰۰ حرف باشد.";
  if (!v.followers.trim()) e.followers = "تعداد فالوئر را وارد کنید.";
  else if (!isCountOk(v.followers)) e.followers = "تعداد فالوئر باید عدد صحیح نامنفی باشد.";
  else if (parseCount(v.followers) < 100) e.followers = "تعداد فالوئر باید حداقل ۱۰۰ باشد.";
  else if (parseCount(v.followers) > 100_000_000) e.followers = "تعداد فالوئر معتبر نیست.";
  if (v.avgStoryViews.trim() && !isCountOk(v.avgStoryViews)) e.avgStoryViews = "میانگین بازدید باید عدد صحیح نامنفی باشد.";
  else if (parseCount(v.avgStoryViews) > 100_000_000) e.avgStoryViews = "عدد بازدید معتبر نیست.";
  if (v.avgPostViews.trim() && !isCountOk(v.avgPostViews)) e.avgPostViews = "میانگین بازدید باید عدد صحیح نامنفی باشد.";
  else if (parseCount(v.avgPostViews) > 100_000_000) e.avgPostViews = "عدد بازدید معتبر نیست.";
  if (v.publishTypes.length === 0) e.publishTypes = "حداقل یک نوع انتشار را انتخاب کنید.";
  // Each selected publish type needs a valid tariff; unselected ones are ignored.
  for (const t of PUBLISH_TYPES) {
    const raw = v.prices[t.value] ?? "";
    if (!v.publishTypes.includes(t.value)) continue;
    if (!raw.trim()) e[`price_${t.value}`] = `تعرفهٔ ${t.label} را وارد کنید.`;
    else if (!isCountOk(raw)) e[`price_${t.value}`] = "تعرفه باید عدد نامنفی باشد.";
    else if (parseCount(raw) < 50_000) e[`price_${t.value}`] = "تعرفه باید حداقل ۵۰٬۰۰۰ تومان باشد.";
  }
  return e;
}

export function validateAvatar(file: File | null): string | undefined {
  if (!file) return undefined;
  if (!ACCEPTED_IMAGES.includes(file.type)) return "تصویر پروفایل باید JPG، PNG یا WebP باشد.";
  if (file.size > MAX_AVATAR_MB * 1024 * 1024) return `حجم تصویر بیشتر از ${formatNumber(MAX_AVATAR_MB)} مگابایت است.`;
  return undefined;
}
export interface AuthValues { name: string; mobile: string }
export function validateAuth(v: AuthValues, needName: boolean): Errors<keyof AuthValues> {
  const e: Errors<keyof AuthValues> = {};
  if (needName && v.name.trim().length < 3) e.name = "نام و نام خانوادگی را وارد کنید.";
  if (!/^09\d{9}$/.test(toLatinDigits(v.mobile.trim()))) e.mobile = "شمارهٔ موبایل را به شکل ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.";
  return e;
}
