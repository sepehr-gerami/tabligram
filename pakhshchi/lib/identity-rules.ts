// قوانین خالص هویت و اطلاعات پرداخت صاحب پیج: کد ملی، شماره کارت و نام.
// این قوانین فقط «قالب و صحت ظاهری» را بررسی می‌کنند (چک‌سام و فرمت).
// تطبیق واقعی کد ملی با شخص و شماره کارت فقط با یک سرویس استعلام یا بررسی دستی مدیر ممکن است؛
// این فایل چنین چیزی را وانمود نمی‌کند.
import { toLatinDigits } from "@/lib/utils";

const digitsOnly = (s: string) => toLatinDigits(s).replace(/[\s\-\u200c\u066C\u060C,.]/g, "");

/* ---------------------------- کد ملی ---------------------------- */

export const normalizeNationalId = (input: string): string => digitsOnly(input);

/** ده رقم، نه همهٔ ارقام یکسان، و رقم کنترل درست (الگوریتم کد ملی ایران). */
export function isValidNationalId(id: string): boolean {
  if (!/^\d{10}$/.test(id)) return false;
  if (/^(\d)\1{9}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(id[i]) * (10 - i);
  const r = sum % 11;
  const check = Number(id[9]);
  return r < 2 ? check === r : check === 11 - r;
}

/* -------------------------- شماره کارت -------------------------- */

export const normalizeCardNumber = (input: string): string => digitsOnly(input);

export function passesLuhn(num: string): boolean {
  if (!/^\d+$/.test(num)) return false;
  let sum = 0;
  let double = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** شانزده رقم و چک‌سام Luhn. */
export const isValidCardNumber = (card: string): boolean => /^\d{16}$/.test(card) && passesLuhn(card);

export const cardLast4 = (card: string): string => card.slice(-4);
export const maskCard = (card: string): string => `****-****-****-${card.slice(-4)}`;

/* ------------------------------ نام ------------------------------ */

/** ی/ک عربی را فارسی می‌کند، اعراب و کشیده را برمی‌دارد و فاصله‌ها را یکی می‌کند (نیم‌فاصله حفظ می‌شود). */
export function cleanPersonName(input: string): string {
  return input
    .replace(/[\u064A\u0649]/g, "\u06CC")
    .replace(/\u0643/g, "\u06A9")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const matchKey = (s: string) => cleanPersonName(s).replace(/[\s\u200c\u200e\u200f]/g, "").toLowerCase();

/** مقایسهٔ دو نام بدون حساسیت به نیم‌فاصله، فاصله، ی/ک عربی و اعراب. نام خالی هرگز تطبیق ندارد. */
export function namesMatch(a: string, b: string): boolean {
  const ka = matchKey(a);
  return ka !== "" && ka === matchKey(b);
}

const NAME_RE = /^[\u0621-\u063A\u0641-\u064A\u0649\u067E\u0686\u0698\u06A9\u06AF\u06CC\u06C0a-zA-Z\u200c ]+$/;
const NAME_MIN = 2;
const NAME_MAX = 40;

/* ------------------------ ورودی پرداخت ------------------------ */

export interface PayoutData {
  firstName: string;
  lastName: string;
  nationalId: string;
  cardNumber: string;
  cardLast4: string;
}
export type PayoutField = "firstName" | "lastName" | "nationalId" | "cardNumber";
export type PayoutErrors = Partial<Record<PayoutField, string>>;
export type PayoutResult = { ok: true; data: PayoutData } | { ok: false; errors: PayoutErrors };

export function parsePayoutInput(raw: Record<string, unknown>): PayoutResult {
  const errors: PayoutErrors = {};

  const name = (key: "firstName" | "lastName", label: string) => {
    const v = cleanPersonName(typeof raw[key] === "string" ? (raw[key] as string) : "");
    if (v.length < NAME_MIN || v.length > NAME_MAX || !NAME_RE.test(v)) {
      errors[key] = `${label} را با حروف فارسی یا انگلیسی وارد کنید (${NAME_MIN} تا ${NAME_MAX} حرف).`;
    }
    return v;
  };
  const firstName = name("firstName", "نام");
  const lastName = name("lastName", "نام خانوادگی");

  const nationalId = normalizeNationalId(typeof raw.nationalId === "string" ? raw.nationalId : "");
  if (!isValidNationalId(nationalId)) errors.nationalId = "کد ملی معتبر نیست؛ ده رقم و درست وارد کنید.";

  const cardNumber = normalizeCardNumber(typeof raw.cardNumber === "string" ? raw.cardNumber : "");
  if (!isValidCardNumber(cardNumber)) errors.cardNumber = "شمارهٔ کارت معتبر نیست؛ ۱۶ رقم و درست وارد کنید.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { firstName, lastName, nationalId, cardNumber, cardLast4: cardLast4(cardNumber) } };
}