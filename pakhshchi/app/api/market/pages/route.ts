import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api";
import { isCategoryId } from "@/lib/categories";
import { toMarketPage } from "@/lib/public-dto";

export const runtime = "nodejs";

/** فهرست عمومی پیج‌های تأییدشده با تعرفه‌ها؛ بدون نیاز به ورود. */
export async function GET(req: Request) {
  return withErrors(async () => {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    if (category !== null && category !== "" && !isCategoryId(category)) {
      return NextResponse.json({ error: "دسته‌بندی معتبر نیست." }, { status: 400 });
    }

    const rows = await prisma.instaPage.findMany({
      where: {
        status: "APPROVED",
        ...(category ? { category } : {}),
        OR: [{ priceStory: { gt: 0 } }, { pricePost: { gt: 0 } }, { priceReels: { gt: 0 } }],
      },
      orderBy: [{ followers: "desc" }, { createdAt: "desc" }],
      take: 200,
      select: {
        id: true, handle: true, url: true, title: true, category: true, city: true, bio: true,
        followers: true, avgStoryViews: true, avgPostViews: true, avgReelsViews: true,
        priceStory: true, pricePost: true, priceReels: true, avatarUrl: true,
        verification: { select: { status: true } },
      },
    });

    return NextResponse.json(rows.map(toMarketPage), {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
    });
  });
}
