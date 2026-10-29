import type { CategoryId, PublishType } from "@/types";
import { ACCEPTED_MEDIA, MAX_FILE_MB, MIN_BUDGET } from "@/lib/constants";
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
  if (!v.category) e.category = "دسته‌بندی پیج‌ها را انتخاب کنید.";
  if (v.notes.length > 500) e.notes = "توضیحات تکمیلی حداکثر ۵۰۰ حرف باشد.";
  return e;
}

export interface PageValues {
  handle: string; url: string; category: CategoryId | ""; city: string;
  followers: string; price: string; publishTypes: PublishType[];
}
export type PageField = keyof PageValues;

export function validatePage(v: PageValues): Errors<PageField> {
  const e: Errors<PageField> = {};
  if (!isHandle(toLatinDigits(v.handle.trim()))) e.handle = "شناسهٔ پیج معتبر نیست. فقط حروف انگلیسی، عدد، نقطه و زیرخط (۳ تا ۳۰ کاراکتر).";
  const url = v.url.trim();
  if (!url) e.url = "لینک پیج را وارد کنید.";
  else if (!isHttpUrl(url) || !/(^|\.)instagram\.com$/.test(new URL(url).hostname)) e.url = "لینک باید آدرس پیج در اینستاگرام باشد؛ مثل https://instagram.com/username";
  if (!v.category) e.category = "دسته‌بندی پیج را انتخاب کنید.";
  if (v.city.trim().length < 2) e.city = "شهر را وارد کنید.";
  const followers = parseAmount(v.followers);
  if (!v.followers.trim()) e.followers = "تعداد فالوئر را وارد کنید.";
  else if (followers < 100) e.followers = "تعداد فالوئر باید حداقل ۱۰۰ باشد.";
  const price = parseAmount(v.price);
  if (!v.price.trim()) e.price = "تعرفهٔ تبلیغ را به تومان وارد کنید.";
  else if (price < 50_000) e.price = "تعرفه باید حداقل ۵۰٬۰۰۰ تومان باشد.";
  if (v.publishTypes.length === 0) e.publishTypes = "حداقل یک نوع انتشار را انتخاب کنید.";
  return e;
}

export interface AuthValues { name: string; mobile: string }
export function validateAuth(v: AuthValues, needName: boolean): Errors<keyof AuthValues> {
  const e: Errors<keyof AuthValues> = {};
  if (needName && v.name.trim().length < 3) e.name = "نام و نام خانوادگی را وارد کنید.";
  if (!/^09\d{9}$/.test(toLatinDigits(v.mobile.trim()))) e.mobile = "شمارهٔ موبایل را به شکل ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.";
  return e;
}
