import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { checkHoldRequest, availableBalance, addHours, POLICY } from "@/lib/money-rules";
import type { PagePublishType } from "@/lib/page-rules";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    
    const pageId = body.pageId;
    const publishType = body.publishType as PagePublishType;

    if (!pageId || !publishType) {
      return NextResponse.json({ error: "اطلاعات ناقص است." }, { status: 400 });
    }

    // 1. گرفتن اطلاعات کمپین و پیج
    const campaign = await prisma.campaign.findUnique({ where: { id, advertiserId: user.id } });
    const page = await prisma.instaPage.findUnique({ where: { id: pageId } });
    
    if (!campaign || !page) {
      return NextResponse.json({ error: "کمپین یا پیج یافت نشد." }, { status: 404 });
    }

    // 2. گرفتن موجودی کاربر
    const deposits = await prisma.deposit.findMany({ where: { userId: user.id, status: "VERIFIED" } });
    const allUserHolds = await prisma.hold.findMany({ where: { advertiserId: user.id } });
    const userAvailableBalance = availableBalance(deposits.map(d => d.amount), allUserHolds);

    // 3. گرفتن بلوکه‌های فعال همین کمپین (برای چک کردن بودجه باقی‌مانده)
    const campaignOrders = await prisma.order.findMany({
      where: { campaignId: campaign.id },
      include: { hold: true }
    });
    const campaignActiveHolds = campaignOrders
      .map(o => o.hold)
      .filter(h => h !== null && h.status !== "REFUNDED")
      .reduce((sum, h) => sum + (h?.amount || 0), 0);

    // 4. گرفتن تعداد سفارش‌های موفق صاحب پیج (برای قانون تازه‌واردها)
    const ownerCompletedOrders = await prisma.order.count({
      where: { pageId: page.id, status: "PAID_FULL" }
    });

    // 5. فراخوانی قانون تو (checkHoldRequest)
    const check = checkHoldRequest({
      advertiserId: user.id,
      page: {
        priceStory: page.priceStory,
        pricePost: page.pricePost,
        priceReels: page.priceReels,
        ownerId: page.ownerId,
        status: page.status,
        category: page.category
      },
      type: publishType,
      campaign: {
        advertiserId: campaign.advertiserId,
        budget: campaign.budget,
        category: campaign.category,
        publishTypes: campaign.publishTypes.split(",").filter(Boolean) as PagePublishType[],
        status: campaign.status
      },
      campaignActiveHolds,
      available: userAvailableBalance,
      ownerCompletedOrders
    });

    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    // 6. ثبت در دیتابیس در قالب Transaction
    const result = await prisma.$transaction(async (tx) => {
      // ساخت سفارش
      const order = await tx.order.create({
        data: {
          campaignId: campaign.id,
          pageId: page.id,
          amount: check.amount,
          publishType: publishType,
          status: "REQUESTED",
          respondByAt: addHours(new Date(), POLICY.respondHours),
        }
      });

      // ساخت بلوکه
      await tx.hold.create({
        data: {
          orderId: order.id,
          advertiserId: user.id,
          amount: check.amount,
          status: "HELD"
        }
      });

      return order;
    });

    return NextResponse.json({ 
      message: "درخواست ارسال شد و مبلغ بلوکه شد.", 
      orderId: result.id 
    });
  });
}