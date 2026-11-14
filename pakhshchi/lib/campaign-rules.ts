// قوانین خالص کمپین: اعتبارسنجی ورودی تبلیغ‌دهنده و خواندن نوع‌های انتشار.
// نام کسب‌وکار و لینک تا پذیرش درخواست از صاحب پیج مخفی‌اند؛ پس در متن‌های آزاد (عنوان، توضیحات، یادداشت)
// راه تماس نباید نوشته شود (contactLeakErrors).
import { isCategoryId } from "@/lib/categories";
import { isSafeImageUrl } from "@/lib/image-rules";
import { PAGE_PUBLISH_TYPES, type PagePublishType } from "@/lib/page-rules";
import { isHandle, isHttpUrl, toLatinDigits } from "@/lib/utils";
import { contactLeakErrors } from "@/lib/visibility-rules";

export const CAMPAIGN_LIMITS = {
  minBudget: 500_000,
  maxBudget: 1_000_000_000,
  minTitle: 3,
  maxTitle: 80,
  maxBusiness: 60,
  minDescription: 15,
  maxDescription: 1000,
  maxNotes: 500,
  maxCity: 40,
  maxLink: 300,
  maxMediaUrl: 500,
} as const;

export interface CampaignData {
  title: string;
  business: string;
  description: string;
  link: string;
  budget: number;
  publishTypes: PagePublishType[];
  category: string | null;
  city: string | null;
  notes: string | null;
  mediaUrl: string | null;
}
export type CampaignField = keyof CampaignData;
export type CampaignErrors = Partial<Record<CampaignField, string>>;
export type CampaignParse = { ok: true; data: CampaignData } | { ok: false; errors: CampaignErrors };

const collapse = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

function toMoney(v: unknown): number | null {
  if (typeof v === "number") return Number.isInteger(v) && v >= 0 ? v : null;
  if (typeof v !== "string") return null;
  const t = toLatinDigits(v).replace(/[\s,\u066C\u060C]/g, "");
  return /^\d+$/.test(t) ? Number(t) : null;
}

export function parseCampaignInput(raw: Record<string, unknown>): CampaignParse {
  const errors: CampaignErrors = {};

  const title = collapse(raw.title);
  if (title.length < CAMPAIGN_LIMITS.minTitle || title.length > CAMPAIGN_LIMITS.maxTitle) {
    errors.title = `عنوان باید بین ${CAMPAIGN_LIMITS.minTitle} تا ${CAMPAIGN_LIMITS.maxTitle} حرف باشد.`;
  }

  const business = collapse(raw.business);
  if (business.length < 1 || business.length > CAMPAIGN_LIMITS.maxBusiness) {
    errors.business = `نام کسب‌وکار را وارد کنید (حداکثر ${CAMPAIGN_LIMITS.maxBusiness} حرف).`;
  }

  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  if (description.length < CAMPAIGN_LIMITS.minDescription || description.length > CAMPAIGN_LIMITS.maxDescription) {
    errors.description = `توضیحات باید بین ${CAMPAIGN_LIMITS.minDescription} تا ${CAMPAIGN_LIMITS.maxDescription} حرف باشد.`;
  }

  const link = toLatinDigits(typeof raw.link === "string" ? raw.link.trim() : "");
  if (!link || link.length > CAMPAIGN_LIMITS.maxLink || !(isHttpUrl(link) || isHandle(link))) {
    errors.link = "لینک پیج یا سایت را درست وارد کنید (https://… یا @username).";
  }

  const budget = toMoney(raw.budget);
  if (budget === null) errors.budget = "بودجه را به‌صورت عدد (تومان) وارد کنید.";
  else if (budget < CAMPAIGN_LIMITS.minBudget || budget > CAMPAIGN_LIMITS.maxBudget) {
    errors.budget = `بودجه باید بین ${CAMPAIGN_LIMITS.minBudget.toLocaleString("en-US")} و ${CAMPAIGN_LIMITS.maxBudget.toLocaleString("en-US")} تومان باشد.`;
  }

  const picked = new Set<PagePublishType>();
  if (Array.isArray(raw.publishTypes)) {
    for (const t of raw.publishTypes) if ((PAGE_PUBLISH_TYPES as readonly unknown[]).includes(t)) picked.add(t as PagePublishType);
  }
  const publishTypes = PAGE_PUBLISH_TYPES.filter((t) => picked.has(t));
  if (publishTypes.length === 0) errors.publishTypes = "حداقل یک نوع انتشار (استوری، پست یا ریلز) را انتخاب کنید.";

  let category: string | null = null;
  if (raw.category !== undefined && raw.category !== null && raw.category !== "") {
    if (typeof raw.category === "string" && isCategoryId(raw.category)) category = raw.category;
    else errors.category = "دسته‌بندی معتبر نیست.";
  }

  const city = collapse(raw.city);
  if (city.length > CAMPAIGN_LIMITS.maxCity) errors.city = `شهر حداکثر ${CAMPAIGN_LIMITS.maxCity} حرف باشد.`;

  const notes = typeof raw.notes === "string" ? raw.notes.trim() : "";
  if (notes.length > CAMPAIGN_LIMITS.maxNotes) errors.notes = `یادداشت حداکثر ${CAMPAIGN_LIMITS.maxNotes} حرف باشد.`;

  let mediaUrl: string | null = null;
  if (raw.mediaUrl !== undefined && raw.mediaUrl !== null && raw.mediaUrl !== "") {
    if (typeof raw.mediaUrl === "string" && raw.mediaUrl.length <= CAMPAIGN_LIMITS.maxMediaUrl && isSafeImageUrl(raw.mediaUrl)) mediaUrl = raw.mediaUrl;
    else errors.mediaUrl = "آدرس تصویر یا ویدئو معتبر نیست.";
  }

  // متن‌هایی که صاحب پیج قبل از پذیرش می‌بیند نباید راه تماس داشته باشند
  const leaks = contactLeakErrors({ title, description, notes });
  for (const [field, message] of Object.entries(leaks)) {
    if (!errors[field as CampaignField]) errors[field as CampaignField] = message;
  }

  if (Object.keys(errors).length > 0 || budget === null) return { ok: false, errors };
  return {
    ok: true,
    data: {
      title, business, description, link, budget, publishTypes,
      category, city: city === "" ? null : city, notes: notes === "" ? null : notes, mediaUrl,
    },
  };
}

/** نوع‌های انتشار یک کمپین از ستون publishTypes (کاماجدا)؛ اگر خالی بود از ستون قدیمی publishType. */
export function campaignTypes(c: { publishTypes: string; publishType: string }): PagePublishType[] {
  const valid = (s: string): s is PagePublishType => (PAGE_PUBLISH_TYPES as readonly string[]).includes(s);
  const list = c.publishTypes.split(",").map((s) => s.trim()).filter(valid);
  const unique = PAGE_PUBLISH_TYPES.filter((t) => list.includes(t));
  if (unique.length > 0) return unique;
  return valid(c.publishType) ? [c.publishType] : [];
}

export function generateOrderNumber(): string {
  return `PK-${Math.floor(100000 + Math.random() * 900000)}`;
}