// فقط سمت سرور. ذخیرهٔ تصویر بنر و تصاویر آپلودی کاربران روی دیسک سرور، بیرون از پوشهٔ public
// (فایل‌های اضافه‌شده به public بعد از build در حالت production سرو نمی‌شوند).
// فایل‌ها فقط از مسیرهای /api/files/banners/<name> و /api/files/uploads/<name> داده می‌شوند.
// این روش فقط روی سروری که دیسک ماندگار دارد (مثل VPS) درست کار می‌کند، نه روی سرورلس.
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  bannerImageUrl, detectImageType, IMAGE_EXT, imageTypeOfName, storedBannerName, storedUploadName,
  uploadImageUrl, type ImageType,
} from "@/lib/image-rules";

const BANNER_DIR = path.resolve(process.cwd(), "storage", "banners");
const UPLOAD_DIR = path.resolve(process.cwd(), "storage", "uploads");

const isMissing = (e: unknown) => (e as NodeJS.ErrnoException | undefined)?.code === "ENOENT";

/** تصویر را فقط اگر واقعاً PNG/JPEG/WebP باشد با نام تصادفی ذخیره می‌کند؛ وگرنه null. */
export async function saveBannerImage(bytes: Buffer): Promise<{ name: string; url: string; type: ImageType } | null> {
  const type = detectImageType(bytes);
  if (!type) return null;
  const name = `${randomBytes(16).toString("hex")}.${IMAGE_EXT[type]}`;
  await mkdir(BANNER_DIR, { recursive: true });
  await writeFile(path.join(BANNER_DIR, name), bytes, { flag: "wx" });
  return { name, url: bannerImageUrl(name), type };
}

/** خواندن تصویر ذخیره‌شده؛ فقط نام‌های معتبر پذیرفته می‌شود (جلوگیری از پیمایش مسیر). */
export async function readBannerImage(name: string): Promise<{ bytes: Buffer; type: ImageType } | null> {
  const type = imageTypeOfName(name);
  if (!type) return null;
  try {
    return { bytes: await readFile(path.join(BANNER_DIR, name)), type };
  } catch (e) {
    if (isMissing(e)) return null;
    throw e;
  }
}

/** پاک کردن فایل یک آدرس بنر؛ آدرس‌هایی که مال خود سایت نیستند نادیده گرفته می‌شوند. */
export async function deleteStoredBannerImage(url: string): Promise<void> {
  const name = storedBannerName(url);
  if (!name) return;
  try {
    await unlink(path.join(BANNER_DIR, name));
  } catch (e) {
    if (!isMissing(e)) throw e;
  }
}

/** ذخیرهٔ تصویر آپلودی کاربر با نام تصادفی (فقط PNG/JPEG/WebP واقعی). */
export async function saveUploadedImage(bytes: Buffer): Promise<{ name: string; url: string; type: ImageType } | null> {
  const type = detectImageType(bytes);
  if (!type) return null;
  const name = `${randomBytes(16).toString("hex")}.${IMAGE_EXT[type]}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), bytes, { flag: "wx" });
  return { name, url: uploadImageUrl(name), type };
}

/** خواندن تصویر آپلودی؛ فقط نام‌های معتبر (بدون پیمایش مسیر). */
export async function readUploadedImage(name: string): Promise<{ bytes: Buffer; type: ImageType } | null> {
  const type = imageTypeOfName(name);
  if (!type) return null;
  try {
    return { bytes: await readFile(path.join(UPLOAD_DIR, name)), type };
  } catch (e) {
    if (isMissing(e)) return null;
    throw e;
  }
}

/** حذف فایل آپلودی (در صورت وجود). */
export async function deleteUploadedImage(url: string): Promise<void> {
  const name = storedUploadName(url);
  if (!name) return;
  try {
    await unlink(path.join(UPLOAD_DIR, name));
  } catch (e) {
    if (!isMissing(e)) throw e;
  }
}
