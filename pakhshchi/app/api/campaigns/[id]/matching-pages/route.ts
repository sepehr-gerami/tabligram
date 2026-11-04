import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { affordableTypes } from "@/lib/money-rules";
import type { PagePublishType } from "@/lib/page-rules";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // 1. گرفتن کمپین
    const campaign = await prisma.campaign.findUnique({
      where: { id, advertiserId: user.id }
    });
    if (!campaign) {
      return NextResponse.json({ error: "کمپین یافت نشد." }, { status: 404 });
    }

    // 2. بودجه باقی‌مانده
    const activeHolds = await prisma.hold.aggregate({
      where: {
        order: { campaignId: campaign.id },
        status: { not: "REFUNDED" }
      },
      _sum: { amount: true }
    });
    const remainingBudget = campaign.budget - (activeHolds._sum.amount || 0);

    // 3. گرفتن پیج‌ها
    const pages = await prisma.instaPage.findMany({
      where: { status: "APPROVED" }
    });

    // 4. گرفتن تعداد سفارش‌های موفق (با چک کردن خالی نبودن)
    let completedMap = new Map();
    if (pages.length > 0) {
      const paidOrders = await prisma.order.groupBy({
        by: ['pageId'],
        where: {
          pageId: { in: pages.map(p => p.id) },
          status: "PAID_FULL"
        },
        _count: { _all: true }
      });
      completedMap = new Map(paidOrders.map(o => [o.pageId, o._count._all]));
    }

    // 5. نوع‌های انتشار
    const campaignTypes = (campaign.publishTypes || "").split(",").filter(Boolean) as PagePublishType[];

    // 6. فیلتر کردن
    const result: any[] = [];
    for (const page of pages) {
      const ownerCompletedOrders = completedMap.get(page.id) || 0;
      
      if (campaign.category && campaign.category.length > 0 && page.category !== campaign.category) {
        continue;
      }

      // اینجا ممکن است خطا بدهد
      const types = affordableTypes(page, campaignTypes, remainingBudget, ownerCompletedOrders);
      
      if (types.length === 0) continue;

      result.push({
        id: page.id,
        title: page.title,
        category: page.category,
        city: page.city,
        followers: page.followers,
        avgStoryViews: page.avgStoryViews,
        avgPostViews: page.avgPostViews,
        avgReelsViews: page.avgReelsViews,
        priceStory: page.priceStory,
        pricePost: page.pricePost,
        priceReels: page.priceReels,
        avatarUrl: page.avatarUrl,
        availableTypes: types,
        isCategoryMatch: campaign.category === page.category
      });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    // 🚨 اینجا خطای واقعی را با جزئیات کامل برمی‌گردانیم
    console.error("DEBUG ERROR in matching-pages:", error);
    return NextResponse.json({ 
      error: "خطای دیباگ", 
      message: error.message, 
      stack: error.stack 
    }, { status: 500 });
  }
}