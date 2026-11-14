// قوانین خالص تصویر: تشخیص نوع واقعی فایل از روی بایت‌ها و نام‌گذاری امن فایل‌های ذخیره‌شده.
// نوع فایل هرگز از هدر Content-Type یا پسوند کلاینت گرفته نمی‌شود؛ فقط از روی محتوای واقعی.
// SVG عمداً مجاز نیست (می‌تواند اسکریپت داشته باشد).

export type ImageType = "image/png" | "image/jpeg" | "image/webp";

export const IMAGE_EXT: Record<ImageType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const EXT_IMAGE_TYPE: Record<string, ImageType> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

/** سقف حجم تصویر بنر */
export const MAX_BANNER_BYTES = 3 * 1024 * 1024;

const startsWith = (b: Uint8Array, sig: number[], offset = 0): boolean =>
  b.length >= offset + sig.length && sig.every((v, i) => b[offset + i] === v);

/** نوع واقعی تصویر از روی امضای ابتدای فایل؛ اگر PNG/JPEG/WebP نبود null. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  // WebP: "RIFF" ???? "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

/** نام فایل ذخیره‌شده: ۳۲ نویسهٔ هگز تصادفی + پسوند مجاز. هیچ مسیر یا نقطهٔ دیگری مجاز نیست. */
export const STORED_NAME_RE = /^[a-f0-9]{32}\.(png|jpg|webp)$/;

export const isStoredName = (name: string): boolean => STORED_NAME_RE.test(name);

export const bannerImageUrl = (name: string): string => `/api/files/banners/${name}`;

const BANNER_URL_RE = /^\/api\/files\/banners\/([a-f0-9]{32}\.(?:png|jpg|webp))$/;

/** اگر آدرس دقیقاً مال فایل بنر ذخیره‌شدهٔ خودِ سایت باشد، نام فایل؛ وگرنه null. */
export function storedBannerName(url: string): string | null {
  const m = BANNER_URL_RE.exec(url);
  return m ? m[1] : null;
}

/** تصاویر آپلود کاربران (کراتیو کمپین/مدرک انتشار) در مسیر جدا و با همان نام‌گذاری امن. */
export const uploadImageUrl = (name: string): string => `/api/files/uploads/${name}`;

const UPLOAD_URL_RE = /^\/api\/files\/uploads\/([a-f0-9]{32}\.(?:png|jpg|webp))$/;

export function storedUploadName(url: string): string | null {
  const m = UPLOAD_URL_RE.exec(url);
  return m ? m[1] : null;
}

/** هر آدرس تصویر مجاز: فایل آپلودشدهٔ خود سایت یا URL کامل https/http. */
export function isSafeImageUrl(url: string): boolean {
  if (storedUploadName(url) !== null) return true;
  try {
    const u = new URL(url);
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

export const imageTypeOfName = (name: string): ImageType | null => {
  if (!isStoredName(name)) return null;
  return EXT_IMAGE_TYPE[name.slice(name.lastIndexOf(".") + 1)] ?? null;
};