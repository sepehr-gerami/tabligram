import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrors } from "@/lib/api";

export const runtime = "nodejs";

/** سفارش‌های دارای اختلاف (بلوکهٔ DISPUTED) با گزارش‌های باز. */
export async function GET() {
  return withErrors(async () => {
    await requireAdmin();
    const holds = await prisma.hold.findMany({
      where: { status: "DISPUTED" },
      orderBy: { updatedAt: "desc" },
      take: 300,
      include: {
        order: {
          include: {
            campaign: { select: { id: true, title: true, business: true, orderNumber: true, advertiser: { select: { id: true, name: true, mobile: true } } } },
            page: { select: { id: true, title: true, handle: true, owner: { select: { id: true, name: true, mobile: true } } } },
            proofs: { select: { kind: true, proofUrl: true, caption: true } },
            disputes: { orderBy: { createdAt: "desc" } },
          },
        },
      },
    });
    return NextResponse.json(holds, { headers: { "Cache-Control": "no-store" } });
  });
}
