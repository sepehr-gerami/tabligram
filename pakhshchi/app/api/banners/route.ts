import { NextResponse } from "next/server";
import type { BannerPlacement } from "@prisma/client";
import { prisma } from "@/lib/db";
import { badRequest, withErrors } from "@/lib/api";
import { BANNER_PLACEMENTS, isBannerLive, publicBanner } from "@/lib/banner-rules";

export const runtime = "nodejs";

/** بنرهای فعال و در بازهٔ نمایش یک جایگاه (پیش‌فرض HERO)؛ فقط فیلدهای عمومی. بدون نیاز به ورود. */
export async function GET(req: Request) {
  return withErrors(async () => {
    const asked = new URL(req.url).searchParams.get("placement") ?? "HERO";
    if (!(BANNER_PLACEMENTS as readonly string[]).includes(asked)) return badRequest("جایگاه بنر معتبر نیست.");

    const now = new Date();
    const rows = await prisma.banner.findMany({
      where: { placement: asked as BannerPlacement, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    const live = rows.filter((b) => isBannerLive(b, now)).map(publicBanner);
    return NextResponse.json(live, { headers: { "Cache-Control": "public, max-age=30, s-maxage=30" } });
  });
}