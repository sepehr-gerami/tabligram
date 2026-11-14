import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrors } from "@/lib/api";

export const runtime = "nodejs";

/** پرونده‌های کارت پرداخت صاحبان پیج برای بررسی مدیر. */
export async function GET(req: Request) {
  return withErrors(async () => {
    await requireAdmin();
    const status = new URL(req.url).searchParams.get("status") ?? "PENDING";
    const allowed = ["PENDING", "VERIFIED", "REJECTED", "NONE"];
    const where = allowed.includes(status) ? { payoutStatus: status as "PENDING" | "VERIFIED" | "REJECTED" | "NONE" } : {};

    const rows = await prisma.publisherProfile.findMany({
      where,
      orderBy: [{ payoutStatus: "asc" }, { payoutSubmittedAt: "desc" }],
      take: 300,
      select: {
        id: true, userId: true, firstName: true, lastName: true, cardLast4: true,
        payoutStatus: true, payoutRejectReason: true, payoutSubmittedAt: true, payoutReviewedAt: true,
        user: { select: { name: true, mobile: true } },
      },
    });
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
  });
}
