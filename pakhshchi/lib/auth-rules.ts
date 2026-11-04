// قوانین مشترک ورود/ثبت‌نام. هم در کلاینت (فرم) و هم در سرور (API) استفاده می‌شود؛
// پس هیچ import سمت‌سروری در این فایل نیست. سرور همیشه دوباره اعتبارسنجی می‌کند.
import { toLatinDigits } from "@/lib/utils";

export const MIN_PASSWORD_LENGTH = 8;
/** bcrypt فقط ۷۲ بایت اول رمز را در نظر می‌گیرد؛ حرف فارسی در UTF-8 دو بایت است. */
export const MAX_PASSWORD_BYTES = 72;
export const MOBILE_RE = /^09\d{9}$/;

/** ارقام فارسی/عربی را لاتین می‌کند، فاصله و نیم‌فاصله را حذف و پیش‌شمارهٔ +98 را به 0 تبدیل می‌کند. */
export const normalizeMobile = (s: string) =>
  toLatinDigits(s)
    .replace(/[\s\u200c-]/g, "")
    .replace(/^(\+98|0098|98)(?=9\d{9}$)/, "0");

export const isMobile = (s: string) => MOBILE_RE.test(s);

export const normalizeName = (s: string) => s.replace(/\s+/g, " ").trim();

export type AuthField = "name" | "mobile" | "password";
export type AuthErrors = Partial<Record<AuthField, string>>;

const byteLength = (s: string) => new TextEncoder().encode(s).length;

/** مشکل رمز عبور برای ثبت‌نام؛ undefined یعنی قابل‌قبول. */
export function passwordProblem(password: string, mobile = ""): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) return `رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد.`;
  if (byteLength(password) > MAX_PASSWORD_BYTES) return "رمز عبور بیش از حد طولانی است.";
  if (/^\d+$/.test(toLatinDigits(password))) return "رمز عبور نباید فقط عدد باشد.";
  if (mobile && toLatinDigits(password).includes(mobile)) return "رمز عبور نباید شمارهٔ موبایل شما باشد.";
  return undefined;
}

/** در ورود قوانین رمز را فاش نمی‌کنیم؛ فقط خالی نبودن. */
export function validateLogin(v: { mobile: string; password: string }): AuthErrors {
  const e: AuthErrors = {};
  if (!isMobile(v.mobile)) e.mobile = "شمارهٔ موبایل را به شکل ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.";
  if (!v.password) e.password = "رمز عبور را وارد کنید.";
  return e;
}

export function validateRegister(v: { name: string; mobile: string; password: string }): AuthErrors {
  const e: AuthErrors = {};
  if (v.name.length < 3) e.name = "نام و نام خانوادگی را وارد کنید.";
  else if (v.name.length > 60) e.name = "نام حداکثر ۶۰ حرف باشد.";
  if (!isMobile(v.mobile)) e.mobile = "شمارهٔ موبایل را به شکل ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.";
  const pw = passwordProblem(v.password, v.mobile);
  if (pw) e.password = pw;
  return e;
}
