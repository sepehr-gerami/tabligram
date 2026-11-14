import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import type { CampaignStatus } from "@prisma/client";

export const runtime = "nodejs";

const STATUSES = ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "RUNNING", "COMPLETED", "CANCELLED"] as const;

/** همهٔ کمپین‌ها برای مدیر با جمع بلوکه و کمیسیون. */
export async function GET(req: Request) {
  return withErrors(async () => {
    await requireAdmin();
    const asked = new URL(req.url).searchParams.get("status");
    const where = asked && (STATUSES as readonly string[]).includes(asked) ? { status: asked as CampaignStatus } : {};

    const rows = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        advertiser: { select: { id: true, name: true, mobile: true } },
        orders: {
          select: {
            id: true, status: true, amount: true,
            page: { select: { id: true, title: true, handle: true } },
            hold: { select: { status: true, amount: true, commission: true, publisherAmount: true } },
          },
        },
      },
    });

    const data = rows.map((c) => {
      const active = c.orders.filter((o) => o.hold && o.hold.status !== "REFUNDED");
      const blocked = active.reduce((s, o) => s + (o.hold?.amount ?? 0), 0);
      const commission = active.reduce((s, o) => s + (o.hold?.commission ?? 0), 0);
      return {
        id: c.id, orderNumber: c.orderNumber, title: c.title, business: c.business, description: c.description,
        link: c.link, budget: c.budget, pageCount: c.pageCount, publishTypes: c.publishTypes,
        category: c.category, city: c.city, status: c.status, createdAt: c.createdAt,
        advertiser: c.advertiser,
        orderCount: c.orders.length,
        blocked,
        remainingBudget: Math.max(0, c.budget - blocked),
        commission,
        orders: c.orders,
      };
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  });
}
