import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { toOrderView } from "@/lib/public-dto";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** جزئیات سفارش برای تبلیغ‌دهنده، صاحب پیج یا مدیر؛ هویت طرفین تا پذیرش مخفی است. */
export async function GET(_req: Request, { params }: Ctx) {
  return withErrors(async () => {
    const user = await requireUser();
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        campaign: {
          select: {
            id: true, advertiserId: true, title: true, description: true, business: true, link: true,
            mediaUrl: true, mediaKind: true, orderNumber: true,
          },
        },
        page: {
          select: {
            id: true, ownerId: true, title: true, handle: true, category: true, avatarUrl: true,
            followers: true, avgStoryViews: true, avgPostViews: true, avgReelsViews: true,
          },
        },
        hold: true,
        proofs: { select: { kind: true, proofUrl: true, caption: true, createdAt: true } },
      },
    });
    if (!order) return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });

    const isAdvertiser = order.campaign.advertiserId === user.id;
    const isOwner = order.page.ownerId === user.id;
    if (!isAdvertiser && !isOwner && !user.isAdmin) throw new HttpError(403, "به این سفارش دسترسی ندارید.");

    const view = toOrderView(order, { isAdmin: user.isAdmin, isAdvertiser, isOwner });
    return NextResponse.json(
      { ...view, viewer: isAdvertiser ? "ADVERTISER" : isOwner ? "OWNER" : "ADMIN", orderNumber: order.campaign.orderNumber, pageStats: {
        followers: order.page.followers, avgStoryViews: order.page.avgStoryViews,
        avgPostViews: order.page.avgPostViews, avgReelsViews: order.page.avgReelsViews,
      } },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
