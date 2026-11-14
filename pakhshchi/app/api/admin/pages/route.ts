import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrors } from "@/lib/api";

export const runtime = "nodejs";

/** همهٔ پیج‌ها برای بررسی مدیر. */
export async function GET() {
  return withErrors(async () => {
    await requireAdmin();
    const pages = await prisma.instaPage.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 500,
      select: {
        id: true, handle: true, url: true, title: true, category: true, city: true, bio: true,
        followers: true, avgStoryViews: true, avgPostViews: true, avgReelsViews: true,
        priceStory: true, pricePost: true, priceReels: true, status: true, rejectReason: true,
        avatarUrl: true, createdAt: true, updatedAt: true,
        owner: { select: { id: true, name: true, mobile: true } },
        verification: { select: { status: true, method: true } },
      },
    });
    return NextResponse.json(pages, { headers: { "Cache-Control": "no-store" } });
  });
}
