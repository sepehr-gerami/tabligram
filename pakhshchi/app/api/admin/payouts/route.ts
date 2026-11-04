import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  return withErrors(async () => {
    await requireAdmin(); // فقط ادمین دسترسی دارد

    const payouts = await prisma.hold.findMany({
      where: { status: "PAYOUT_DUE" },
      include: {
        order: {
          include: {
            campaign: { select: { title: true } },
            page: {
              select: {
                title: true,
                handle: true,
                owner: {
                  include: { publisherProfile: true }
                }
              }
            }
          }
        }
      },
      orderBy: { payoutDueAt: "asc" }
    });

    const now = new Date();
    const result = payouts.map((hold) => {
      // چک میکنیم آیا زمان قانونی (مثلا ۷۲ ساعت) گذشته است یا نه
      const isTimeReached = hold.payoutDueAt ? hold.payoutDueAt <= now : false;
      
      const profile = hold.order.page.owner.publisherProfile;
      const cardName = profile?.firstName ? `${profile.firstName} ${profile.lastName}` : "ثبت نشده";

      return {
        holdId: hold.id,
        amount: hold.amount,
        payoutDueAt: hold.payoutDueAt,
        isTimeReached, 
        campaignTitle: hold.order.campaign.title,
        pageTitle: hold.order.page.title,
        pageHandle: hold.order.page.handle,
        publisherName: hold.order.page.owner.name,
        cardNumber: profile?.payoutCard || "ثبت نشده",
        cardHolderName: cardName,
        payoutStatus: profile?.payoutStatus || "NONE",
      };
    });

    return NextResponse.json(result);
  });
}