// قوانین خالص کمیسیون پلتفرم. همهٔ مبلغ‌ها عدد صحیح تومان هستند.
// نرخ پیش‌فرض ۱۰٪ است و در لحظهٔ ساخت هر بلوکه روی همان سفارش ثابت می‌شود.

/** ۱۰۰۰ basis point = ۱۰٪ */
export const DEFAULT_COMMISSION_BPS = 1000;

export interface MoneySplit {
  /** سهم پلتفرم (کمیسیون) */
  commission: number;
  /** مبلغ خالص صاحب پیج */
  publisherAmount: number;
}

const isMoney = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;

/**
 * تقسیم مبلغ سفارش به کمیسیون و سهم صاحب پیج.
 * کمیسیون به نزدیک‌ترین تومان گرد می‌شود و همیشه `commission + publisherAmount === amount`.
 */
export function splitCommission(amount: number, commissionBps: number = DEFAULT_COMMISSION_BPS): MoneySplit {
  if (!isMoney(amount)) throw new RangeError("amount must be a non-negative integer");
  if (!Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 10_000) {
    throw new RangeError("commissionBps must be an integer between 0 and 10000");
  }
  const commission = Math.round((amount * commissionBps) / 10_000);
  return { commission, publisherAmount: amount - commission };
}

/** نرخ قابل نمایش (مثلاً 10 برای ۱۰٪). */
export const commissionPercent = (bps: number = DEFAULT_COMMISSION_BPS): number => bps / 100;
