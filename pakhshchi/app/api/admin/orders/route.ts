import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import type { OrderStatus } from "@prisma/client";

export const runtime = "nodejs";

const STATUSES = [
  "REQUESTED", "ACCEPTED", "DECLINED", "PUBLISHED", "CONFIRMED", "PAID_FULL", "DISPUTED", "CANCELLED",
] as const;

/** همهٔ سفارش‌ها برای مدیر؛ با فیلتر ?status=. */
export async function GET(req: Request) {
  return withErrors(async () => {
    await requireAdmin();
    const asked = new URL(req.url).searchParams.get("status");
    const where = asked && (STATUSES as readonly string[]).includes(asked) ? { status: asked as OrderStatus } : {};

    const rows = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 400,
      include: {
        campaign: {
          select: {
            id: true, title: true, business: true, link: true, orderNumber: true,
            advertiser: { select: { id: true, name: true, mobile: true } },
          },
        },
        page: { select: { id: true, title: true, handle: true, ownerId: true, owner: { select: { name: true, mobile: true } } } },
        hold: true,
        proofs: { select: { kind: true, proofUrl: true, caption: true } },
      },
    });

    return NextResponse.json(
      rows.map((o) => ({
        id: o.id,
        status: o.status,
        amount: o.amount,
        publishType: o.publishType,
        createdAt: o.createdAt,
        respondByAt: o.respondByAt,
        publishDeadlineAt: o.publishDeadlineAt,
        proofSubmittedAt: o.proofSubmittedAt,
        advertiserConfirmedAt: o.advertiserConfirmedAt,
        closedReason: o.closedReason,
        campaign: o.campaign,
        page: o.page,
        hold: o.hold,
        proofs: o.proofs,
      })),
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
