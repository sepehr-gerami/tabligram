import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { readStoredCard } from "@/lib/payout";

export const runtime = "nodejs";

/**
 * بلوکه‌های آمادهٔ پرداخت (و اختلاف‌های منجمد) برای مدیر.
 * شمارهٔ کارت فقط برای پروندهٔ VERIFIED و فقط با همین درخواست مدیر برمی‌گردد؛ پاسخ no-store است.
 */
export async function GET() {
  return withErrors(async () => {
    await requireAdmin();

    const holds = await prisma.hold.findMany({
      where: { status: { in: ["PAYOUT_DUE", "DISPUTED"] } },
      orderBy: [{ status: "asc" }, { payoutDueAt: "asc" }],
      take: 500,
      include: {
        order: {
          select: {
            id: true, status: true, publishType: true, proofSubmittedAt: true,
            advertiserConfirmedAt: true, amount: true,
            campaign: { select: { title: true, orderNumber: true, advertiserId: true } },
            page: { select: { id: true, title: true, handle: true, ownerId: true } },
          },
        },
      },
    });

    const ownerIds = [...new Set(holds.map((h) => h.order.page.ownerId))];
    const profiles = await prisma.publisherProfile.findMany({
      where: { userId: { in: ownerIds } },
      select: {
        userId: true, firstName: true, lastName: true, cardLast4: true, payoutStatus: true,
        payoutRejectReason: true, payoutCard: true,
      },
    });
    const users = await prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, name: true, mobile: true },
    });
    const profileByUser = new Map(profiles.map((p) => [p.userId, p]));
    const userById = new Map(users.map((u) => [u.id, u]));

    const now = new Date();
    const rows = holds.map((hold) => {
      const profile = profileByUser.get(hold.order.page.ownerId) ?? null;
      const owner = userById.get(hold.order.page.ownerId) ?? null;
      const verified = profile?.payoutStatus === "VERIFIED";
      const card = verified ? readStoredCard(profile.payoutCard) : null;
      return {
        holdId: hold.id,
        amount: hold.amount,
        commission: hold.commission,
        publisherAmount: hold.publisherAmount > 0 ? hold.publisherAmount : hold.amount - hold.commission,
        holdStatus: hold.status,
        payoutDueAt: hold.payoutDueAt,
        timeReached: hold.payoutDueAt !== null && hold.payoutDueAt.getTime() <= now.getTime(),
        disputeNote: hold.disputeNote,
        order: {
          id: hold.order.id,
          status: hold.order.status,
          publishType: hold.order.publishType,
          proofSubmittedAt: hold.order.proofSubmittedAt,
          advertiserConfirmedAt: hold.order.advertiserConfirmedAt,
        },
        campaign: hold.order.campaign,
        page: { id: hold.order.page.id, title: hold.order.page.title, handle: hold.order.page.handle },
        publisher: {
          id: owner?.id ?? hold.order.page.ownerId,
          name: owner?.name ?? null,
          mobile: owner?.mobile ?? null,
          cardHolderName: profile ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() : null,
          cardNumber: card,
          cardLast4: profile?.cardLast4 ?? null,
          payoutStatus: profile?.payoutStatus ?? "NONE",
          payoutRejectReason: profile?.payoutRejectReason ?? null,
        },
      };
    });

    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
  });
}
