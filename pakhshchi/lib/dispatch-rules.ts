// قوانین خالص توزیع خودکار کمپین بین پیج‌های واجد شرایط.
// API فقط از همین تابع برای انتخاب پیج‌ها استفاده می‌کند تا قوانین در یک جا بمانند.
import { affordableTypes } from "@/lib/money-rules";
import { priceForType, type PagePublishType } from "@/lib/page-rules";

export interface DispatchPage {
  id: string;
  ownerId: string;
  category: string;
  status: string;
  followers: number;
  priceStory: number;
  pricePost: number;
  priceReels: number;
  ownerCompletedOrders: number;
}

export interface DispatchCampaign {
  advertiserId: string;
  category: string | null;
  publishTypes: PagePublishType[];
  budget: number;
}

export interface DispatchCandidate {
  pageId: string;
  publishType: PagePublishType;
  amount: number;
}

export interface DispatchPlan {
  candidates: DispatchCandidate[];
  /** مجموع مبالغ بلوکه‌شده */
  total: number;
  /** بودجه‌ای که بعد از این توزیع آزاد می‌ماند */
  remaining: number;
}

/**
 * انتخاب حداکثر `maxPages` پیج واجد شرایط و یک نوع انتشار برای هرکدام.
 * - فقط پیج APPROVED، غیرمالک و (در صورت تعیین دسته) هم‌دسته.
 * - هر پیج فقط یک‌بار و هر سفارش باید در بودجهٔ باقی‌مانده بگنجد.
 * - اولویت: تطبیق دسته، سپس فالوئر بیشتر، سپس شناسه (نتیجهٔ پایدار).
 */
export function planDispatch(input: {
  pages: DispatchPage[];
  campaign: DispatchCampaign;
  /** بلوکه‌های فعال فعلی همین کمپین */
  alreadyBlocked: number;
  /** شناسهٔ پیج‌هایی که از قبل سفارش دارند */
  existingPageIds?: Iterable<string>;
  maxPages: number;
}): DispatchPlan {
  const { pages, campaign, alreadyBlocked, maxPages } = input;
  if (!Number.isInteger(maxPages) || maxPages < 0) throw new RangeError("maxPages must be a non-negative integer");
  if (!Number.isInteger(alreadyBlocked) || alreadyBlocked < 0) throw new RangeError("alreadyBlocked must be a non-negative integer");

  let remaining = Math.max(0, campaign.budget - alreadyBlocked);
  const existing = new Set(input.existingPageIds ?? []);
  const sorted = [...pages].sort((a, b) => {
    const matchA = campaign.category !== null && a.category === campaign.category ? 1 : 0;
    const matchB = campaign.category !== null && b.category === campaign.category ? 1 : 0;
    if (matchA !== matchB) return matchB - matchA;
    if (a.followers !== b.followers) return b.followers - a.followers;
    return a.id.localeCompare(b.id);
  });

  const candidates: DispatchCandidate[] = [];
  for (const page of sorted) {
    if (candidates.length >= maxPages) break;
    if (remaining <= 0) break;
    if (page.status !== "APPROVED") continue;
    if (page.ownerId === campaign.advertiserId) continue;
    if (existing.has(page.id)) continue;
    if (campaign.category !== null && page.category !== campaign.category) continue;

    const types = affordableTypes(page, campaign.publishTypes, remaining, page.ownerCompletedOrders);
    if (types.length === 0) continue;

    // ارزان‌ترین نوع ممکن برای اینکه بودجه بین پیج‌های بیشتری پخش شود.
    const type = types.reduce((best, t) => (priceForType(page, t) < priceForType(page, best) ? t : best), types[0]);
    const amount = priceForType(page, type);
    if (amount <= 0 || amount > remaining) continue;

    candidates.push({ pageId: page.id, publishType: type, amount });
    remaining -= amount;
  }

  return { candidates, total: campaign.budget - alreadyBlocked - remaining, remaining };
}

/** سقف پیج‌های یک کمپین؛ هم‌راستا با اعتبارسنجی API. */
export const MAX_PAGES_PER_CAMPAIGN = 100;

/** مبلغ قابل توزیع یک کمپین با توجه به بودجه و بلوکه‌های فعال. */
export const dispatchBudget = (budget: number, activeHolds: number): number => Math.max(0, budget - activeHolds);

/** پیام خطای یکسان برای وقتی موجودی کیف پول کافی نیست. */
export const INSUFFICIENT_FUNDS = "موجودی کیف پول کافی نیست؛ ابتدا از بخش کیف پول، واریز را ثبت و تأیید کنید.";

/** برای تست‌های واحد/یکپارچه: آیا مبلغ در بودجه می‌گنجد؟ */
export const fitsBudget = (amount: number, blocked: number, budget: number): boolean =>
  amount >= 0 && blocked >= 0 && budget >= 0 && blocked + amount <= budget;
