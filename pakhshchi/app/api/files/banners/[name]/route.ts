import { readBannerImage } from "@/lib/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ name: string }> };

/**
 * تصویر بنر ذخیره‌شده. فقط نام‌های ۳۲ نویسهٔ هگز با پسوند png/jpg/webp پذیرفته می‌شود
 * (پیمایش مسیر ممکن نیست) و نوع پاسخ از روی همان پسوند مجاز تعیین می‌شود.
 * نام فایل‌ها تصادفی و یکتا است، پس کش طولانی امن است.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { name } = await params;
  const file = await readBannerImage(name);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.type,
      "Content-Length": String(file.bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}