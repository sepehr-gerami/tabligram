// برچسب و رنگ وضعیت‌های واقعی API (حروف بزرگ Prisma) برای نمایش در کلاینت.
// این فایل عمداً فقط داده و تابع خالص دارد تا هم در سرور و هم در کلاینت قابل import باشد.
import type { Tone } from "@/lib/constants";

export interface StatusMeta {
  label: string;
  tone: Tone;
}

const ORDER: Record<string, StatusMeta> = {
  REQUESTED: { label: "در انتظار پاسخ", tone: "warning" },
  ACCEPTED: { label: "پذیرفته‌شده", tone: "info" },
  NEGOTIATING: { label: "در مذاکره", tone: "info" },
  AGREED: { label: "توافق‌شده", tone: "info" },
  PARTIALLY_PAID: { label: "پرداخت جزئی", tone: "warning" },
  IN_PROGRESS: { label: "در حال اجرا", tone: "info" },
  PUBLISHED: { label: "منتشرشده؛ منتظر تأیید", tone: "warning" },
  CONFIRMED: { label: "تأییدشده", tone: "success" },
  PAID_FULL: { label: "پرداخت‌شده", tone: "success" },
  DISPUTED: { label: "اختلاف", tone: "danger" },
  DECLINED: { label: "ردشده", tone: "danger" },
  CANCELLED: { label: "لغوشده", tone: "neutral" },
};

const HOLD: Record<string, StatusMeta> = {
  HELD: { label: "بلوکه‌شده", tone: "warning" },
  PAYOUT_DUE: { label: "آمادهٔ پرداخت", tone: "info" },
  PAID_OUT: { label: "پرداخت‌شده", tone: "success" },
  REFUNDED: { label: "برگشت به کیف پول", tone: "neutral" },
  DISPUTED: { label: "منجمد (اختلاف)", tone: "danger" },
};

const PAGE: Record<string, StatusMeta> = {
  PENDING: { label: "در انتظار تأیید", tone: "warning" },
  APPROVED: { label: "تأییدشده", tone: "success" },
  REJECTED: { label: "ردشده", tone: "danger" },
  DISABLED: { label: "غیرفعال", tone: "neutral" },
};

const DEPOSIT: Record<string, StatusMeta> = {
  PENDING: { label: "در انتظار تأیید", tone: "warning" },
  VERIFIED: { label: "تأییدشده", tone: "success" },
  REJECTED: { label: "ردشده", tone: "danger" },
};

const CAMPAIGN: Record<string, StatusMeta> = {
  DRAFT: { label: "پیش‌نویس", tone: "neutral" },
  PENDING_REVIEW: { label: "در انتظار بررسی", tone: "warning" },
  APPROVED: { label: "تأییدشده", tone: "info" },
  REJECTED: { label: "ردشده", tone: "danger" },
  RUNNING: { label: "در حال اجرا", tone: "info" },
  COMPLETED: { label: "تکمیل‌شده", tone: "success" },
  CANCELLED: { label: "لغوشده", tone: "neutral" },
};

const PAYOUT: Record<string, StatusMeta> = {
  NONE: { label: "ثبت نشده", tone: "neutral" },
  PENDING: { label: "در انتظار تأیید", tone: "warning" },
  VERIFIED: { label: "تأییدشده", tone: "success" },
  REJECTED: { label: "ردشده", tone: "danger" },
};

const lookup = (map: Record<string, StatusMeta>, status: string | null | undefined): StatusMeta =>
  (status && map[status]) || { label: status || "نامشخص", tone: "neutral" };

export const orderStatusMeta = (s: string | null | undefined) => lookup(ORDER, s);
export const holdStatusMeta = (s: string | null | undefined) => lookup(HOLD, s);
export const pageStatusMeta = (s: string | null | undefined) => lookup(PAGE, s);
export const depositStatusMeta = (s: string | null | undefined) => lookup(DEPOSIT, s);
export const campaignStatusMeta = (s: string | null | undefined) => lookup(CAMPAIGN, s);
export const payoutStatusMeta = (s: string | null | undefined) => lookup(PAYOUT, s);

/** دلایل بسته‌شدن سفارش به فارسی. */
export const closedReasonLabel = (reason: string | null | undefined): string | null => {
  if (!reason) return null;
  return (
    {
      DECLINED_BY_OWNER: "ردشده توسط صاحب پیج",
      REQUEST_EXPIRED: "مهلت پاسخ تمام شد",
      PUBLISH_EXPIRED: "مهلت انتشار تمام شد",
      CANCELLED_BY_ADVERTISER: "لغو توسط تبلیغ‌دهنده",
      DISPUTE_REFUND: "بازگشت مبلغ با رأی مدیر",
    } as Record<string, string>
  )[reason] ?? reason;
};
