import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, badRequest, tooManyRequests, withErrors } from "@/lib/api";
import { MAX_BANNER_BYTES } from "@/lib/image-rules";
import { hit } from "@/lib/rate-limit";
import { saveBannerImage } from "@/lib/storage";
import { readBodyCapped } from "@/lib/upload";

export const runtime = "nodejs";

/**
 * آپلود تصویر بنر فقط برای مدیر.
 * بدنهٔ درخواست خودِ فایل است (نه multipart):
 *   fetch("/api/admin/uploads?kind=banner", { method: "POST", body: file })
 * نوع فایل از روی محتوای واقعی تشخیص داده می‌شود، نه هدر یا پسوند. پاسخ: { url }.
 */
export async function POST(req: Request) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();

    const kind = new URL(req.url).searchParams.get("kind");
    if (kind !== "banner") return badRequest("نوع آپلود معتبر نیست.");

    const limited = hit(`upload:${admin.id}`, 40, 60 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

    const bytes = await readBodyCapped(req, MAX_BANNER_BYTES);
    if (!bytes || bytes.length === 0) {
      return badRequest(`فایل خالی است یا از ${MAX_BANNER_BYTES / 1024 / 1024} مگابایت بزرگ‌تر است.`);
    }

    const saved = await saveBannerImage(bytes);
    if (!saved) return badRequest("فقط تصویر PNG، JPG یا WebP مجاز است.");
    return NextResponse.json({ url: saved.url }, { status: 201 });
  });
}