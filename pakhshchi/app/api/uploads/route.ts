import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, badRequest, clientIp, tooManyRequests, withErrors } from "@/lib/api";
import { hit } from "@/lib/rate-limit";
import { MAX_BANNER_BYTES } from "@/lib/image-rules";
import { saveUploadedImage } from "@/lib/storage";
import { readBodyCapped } from "@/lib/upload";

export const runtime = "nodejs";

const KINDS = new Set(["creative", "proof", "receipt", "avatar"]);

/**
 * آپلود تصویر کاربران (کراتیو تبلیغ، اسکرین‌شات آمار، رسید واریز، آواتار پیج).
 * بدنهٔ درخواست خودِ فایل است (نه multipart):
 *   fetch(`/api/uploads?kind=creative`, { method: "POST", body: file })
 * ورود الزامی است. نوع فایل از محتوای واقعی تشخیص داده می‌شود (SVG مجاز نیست).
 */
export async function POST(req: Request) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const user = await requireUser();

    const kind = new URL(req.url).searchParams.get("kind") ?? "";
    if (!KINDS.has(kind)) return badRequest("نوع آپلود معتبر نیست.");

    const limited = hit(`upload:user:${user.id}:${clientIp(req)}`, 40, 60 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

    const bytes = await readBodyCapped(req, MAX_BANNER_BYTES);
    if (!bytes || bytes.length === 0) return badRequest("فایل تصویر معتبر نیست یا حجم آن بیش از ۳ مگابایت است.");

    const saved = await saveUploadedImage(bytes);
    if (!saved) return badRequest("فقط تصویر PNG، JPEG یا WebP مجاز است.");

    return NextResponse.json({ url: saved.url, kind }, { status: 201 });
  });
}
