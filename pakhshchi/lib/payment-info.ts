// اطلاعات کارت مقصد واریز (کارت‌به‌کارت) از متغیرهای محیطی عمومی خوانده می‌شود.
// مقدار خالی یعنی مدیر هنوز کارت را تنظیم نکرده است؛ UI به‌جای نمایش کارت جعلی، هشدار می‌دهد.
export const PLATFORM_CARD_NUMBER = (process.env.NEXT_PUBLIC_PLATFORM_CARD_NUMBER ?? "").trim();
export const PLATFORM_CARD_HOLDER = (process.env.NEXT_PUBLIC_PLATFORM_CARD_HOLDER ?? "").trim();

const DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const faDigits = (s: string) => s.replace(/\d/g, (d) => DIGITS[Number(d)]);

/** نمایش کارت به‌صورت گروه‌چهاررقمی؛ ورودی خام یا با خط تیره پذیرفته می‌شود. */
export function displayCardNumber(card: string): string {
  const digits = card.replace(/\D/g, "");
  if (digits.length !== 16) return card || "—";
  return faDigits(`${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12)}`);
}

export const isPlatformCardConfigured = PLATFORM_CARD_NUMBER.replace(/\D/g, "").length === 16;
