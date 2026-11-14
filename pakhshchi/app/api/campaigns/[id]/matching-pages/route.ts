import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { affordableTypes } from "@/lib/money-rules";
import { campaignTypes } from "@/lib/campaign-rules";
import { toMarketPage } from "@/lib/public-dto";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** پیج‌های واجد شرایط این کمپین با نوع‌های مقرون‌به‌صرفه؛ فقط صاحب کمپین. */
export async function GET(_req: Request, { params }: Ctx) {
  return withErrors(async () => {
    const user = await requireUser();
    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({ where: { id, advertiserId: user.id } });
    if (!campaign) return NextResponse.json({ error: "کمپین پیدا نشد." }, { status: 404 });

    const blocked = await prisma.hold.findMany({
      where: { order: { campaignId: campaign.id }, status: { not: "REFUNDED" } },
      select: { amount: true },
    });
    const remainingBudget = Math.max(0, campaign.budget - blocked.reduce((s, h) => s + h.amount, 0));
    const pages = await prisma.instaPage.findMany({
      where: { status: "APPROVED", ...(campaign.category ? { category: campaign.category } : {}) },
      select: {
        id: true, handle: true, url: true, title: true, category: true, city: true, bio: true,
        followers: true, avgStoryViews: true, avgPostViews: true, avgReelsViews: true,
        priceStory: true, pricePost: true, priceReels: true, avatarUrl: true,
        verification: { select: { status: true } },
        orders: { where: { status: "PAID_FULL" }, select: { id: true } },
      },
    });

    const types = campaignTypes(campaign);
    const result = pages
      .filter((page) => affordableTypes(page, types, remainingBudget, page.orders.length).length > 0)
      .map((page) => ({
        ...toMarketPage(page),
        availableTypes: affordableTypes(page, types, remainingBudget, page.orders.length),
      }));

    return NextResponse.json({ campaignId: campaign.id, remainingBudget, types, pages: result });
  });
}
