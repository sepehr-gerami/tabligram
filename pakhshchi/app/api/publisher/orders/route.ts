import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { toOrderView } from "@/lib/public-dto";
import { publisherEarnings } from "@/lib/wallet";

export const runtime = "nodejs";

/** همهٔ سفارش‌های پیج‌های من (همهٔ وضعیت‌ها) + خلاصهٔ درآمد خالص. */
export async function GET() {
  return withErrors(async () => {
    const user = await requireUser();

    const [orders, earnings] = await Promise.all([
      prisma.order.findMany({
        where: { page: { ownerId: user.id } },
        orderBy: { createdAt: "desc" },
        take: 300,
        include: {
          campaign: {
            select: {
              id: true, advertiserId: true, title: true, description: true, business: true, link: true,
              mediaUrl: true, orderNumber: true,
            },
          },
          page: { select: { id: true, ownerId: true, title: true, handle: true, category: true, avatarUrl: true } },
          hold: true,
          proofs: { select: { kind: true, proofUrl: true, caption: true } },
        },
      }),
      publisherEarnings(user.id),
    ]);

    const data = orders.map((o) => ({
      ...toOrderView(o, { isAdmin: false, isAdvertiser: false, isOwner: true }),
      orderNumber: o.campaign.orderNumber,
    }));
    return NextResponse.json({ orders: data, earnings }, { headers: { "Cache-Control": "no-store" } });
  });
}
