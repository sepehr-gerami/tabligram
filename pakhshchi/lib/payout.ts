// فقط سمت سرور: خواندن شمارهٔ کارت ذخیره‌شده.
// داده‌های جدید رمزگذاری‌شده‌اند؛ داده‌های قدیمیِ خام (seed) هم برای مهاجرت خوانده می‌شوند.
import { decryptSecret } from "@/lib/crypto";
import { isValidCardNumber, normalizeCardNumber } from "@/lib/identity-rules";

export function readStoredCard(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const plain = stored.startsWith("v1.") ? decryptSecret(stored) : stored;
  if (!plain) return null;
  const card = normalizeCardNumber(plain);
  return isValidCardNumber(card) ? card : null;
}

export const maskCardNumber = (card: string): string => `**** **** **** ${card.slice(-4)}`;
