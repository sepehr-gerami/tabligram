import { readUploadedImage } from "@/lib/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ name: string }> };

/**
 * تصویر آپلودشده (کراتیو/مدرک/رسید). فقط نام ۳۲ نویسهٔ هگز با پسوند مجاز پذیرفته می‌شود؛
 * پیمایش مسیر ممکن نیست و نوع پاسخ از روی همان پسوند تعیین می‌شود.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { name } = await params;
  const file = await readUploadedImage(name);
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
