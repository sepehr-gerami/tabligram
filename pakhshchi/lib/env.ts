// فقط سمت سرور. این فایل را در کامپوننت‌های کلاینت import نکن.
//
// مقدارها «تنبل» (lazy) خوانده می‌شوند تا `next build` بدون env هم خراب نشود،
// ولی در اولین درخواست واقعیِ production، نبودِ مقدار ضروری خطای واضح می‌دهد.

const DEV_FALLBACK_SECRET = "tabligram-dev-only-secret-not-for-production!!";

const isProd = () => process.env.NODE_ENV === "production";

/**
 * کلید اصلی برنامه (رمزگذاری توکن‌های اینستاگرام).
 * - production: الزامی و حداقل ۳۲ کاراکتر.
 * - توسعه: اگر تنظیم نشده باشد مقدار موقت استفاده می‌شود.
 * هشدار: عوض کردن این مقدار، توکن‌های رمزگذاری‌شدهٔ قبلی را غیرقابل‌خواندن می‌کند.
 */
export function getAppSecret(): string {
  const raw = process.env.APP_SECRET?.trim();
  if (raw) {
    if (raw.length < 32) throw new Error("APP_SECRET must be at least 32 characters.");
    return raw;
  }
  if (isProd()) throw new Error("APP_SECRET is required in production.");
  return DEV_FALLBACK_SECRET;
}

export interface MetaConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

/** تنظیمات اپ Meta برای OAuth اینستاگرام؛ اگر کامل نباشد null (اتصال رسمی غیرفعال می‌ماند). */
export function getMetaConfig(): MetaConfig | null {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  const redirectUri = process.env.META_REDIRECT_URI?.trim();
  return appId && appSecret && redirectUri ? { appId, appSecret, redirectUri } : null;
}
