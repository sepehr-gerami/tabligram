import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrors } from "@/lib/api";

export const runtime = "nodejs";

/** همهٔ واریزها؛ پیش‌فرض PENDING و با ?status=all همه. */
export async function GET(req: Request) {
  return withErrors(async () => {
    await requireAdmin();
    const status = new URL(req.url).searchParams.get("status") ?? "PENDING";
    const rows = await prisma.deposit.findMany({
      where: status === "all" ? {} : status === "PENDING" || status === "VERIFIED" || status === "REJECTED" ? { status } : { status: "PENDING" },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 300,
      select: {
        id: true, amount: true, reference: true, receiptUrl: true, note: true, status: true,
        rejectReason: true, createdAt: true, reviewedAt: true,
        user: { select: { id: true, name: true, mobile: true } },
      },
    });
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
  });
}
