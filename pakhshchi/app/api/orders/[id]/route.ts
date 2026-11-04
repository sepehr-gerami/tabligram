import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    const user = await requireAuth();
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        campaign: {
          select: {
            advertiserId: true,
            title: true,
            description: true,
            business: true, // نام کسب‌وکار
            link: true,     // لینک تبلیغ
            mediaUrl: true,
            mediaKind: true,
          }
        },
        page: {
          select: {
            ownerId: true,
            title: true,
            handle: true,   // آیدی اینستاگرام
            category: true,
            avgStoryViews: true,
            avgPostViews: true,
            avgReelsViews: true,
          }
        },
        hold: true,
      }
    });

    if (!order) return NextResponse.json({ error: "سفارش یافت نشد." }, { status: 404 });

    // بررسی دسترسی (فقط تبلیغ‌دهنده، صاحب پیج یا ادمین)
    const isAdvertiser = order.campaign.advertiserId === user.id;
    const isOwner = order.page.ownerId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isAdvertiser && !isOwner && !isAdmin) {
      return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
    }

    // قانون مخفی ماندن هویت‌ها
    const isRevealed = order.revealedAt !== null || isAdmin;

    const responseData = {
      id: order.id,
      status: order.status,
      amount: order.amount,
      publishType: order.publishType,
      createdAt: order.createdAt,
      publishDeadlineAt: order.publishDeadlineAt,
      campaign: {
        title: order.campaign.title,
        description: order.campaign.description,
        mediaUrl: order.campaign.mediaUrl,
        mediaKind: order.campaign.mediaKind,
        business: isRevealed ? order.campaign.business : "***",
        link: isRevealed ? order.campaign.link : "***",
      },
      page: {
        title: order.page.title,
        category: order.page.category,
        handle: isRevealed ? order.page.handle : "***",
      },
      isRevealed
    };

    return NextResponse.json(responseData);
  });
}