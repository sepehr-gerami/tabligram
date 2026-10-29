import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const nf = new Intl.NumberFormat("fa-IR");
export const formatNumber = (n: number) => nf.format(n);
export const formatToman = (n: number) => `${nf.format(n)} تومان`;
export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(iso));

const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";
export const toLatinDigits = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));

/** Accepts Persian/Arabic/Latin digits and separators; returns 0 when empty. */
export const parseAmount = (s: string) => {
  const digits = toLatinDigits(s).replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};

export const formatBytes = (b: number) =>
  b < 1024 * 1024 ? `${formatNumber(Math.max(1, Math.round(b / 1024)))} کیلوبایت` : `${formatNumber(Math.round((b / 1024 / 1024) * 10) / 10)} مگابایت`;

export const isHttpUrl = (s: string) => {
  try {
    const u = new URL(s);
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
  } catch {
    return false;
  }
};

/** Keeps Latin text (handles, URLs) in the right order inside RTL sentences. */
export const ltr = (s: string) => `\u2066${s}\u2069`;

export const isHandle = (s: string) => /^@?[a-zA-Z0-9._]{3,30}$/.test(s);
export const normalizeHandle = (s: string) => (s.startsWith("@") ? s : `@${s}`);
export const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
