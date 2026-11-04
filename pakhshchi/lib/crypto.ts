// رمزگذاری/رمزگشایی توکن‌های اینستاگرام با AES-256-GCM.
// توکن خام هرگز در دیتابیس ذخیره نمی‌شود. فرمت خروجی: v1.<iv>.<tag>.<data> (همه base64).
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "crypto";
import { getAppSecret } from "@/lib/env";

const VERSION = "v1";

let cached: { secret: string; key: Buffer } | null = null;

/** کلید ۳۲ بایتی از APP_SECRET با HKDF (نه هش ساده). */
function getKey(): Buffer {
  const secret = getAppSecret();
  if (!cached || cached.secret !== secret) {
    cached = {
      secret,
      key: Buffer.from(hkdfSync("sha256", secret, "tabligram-salt-v1", "instagram-token-encryption", 32)),
    };
  }
  return cached.key;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

export function decryptSecret(blob: string): string | null {
  try {
    const [version, ivB64, tagB64, dataB64] = blob.split(".");
    if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
