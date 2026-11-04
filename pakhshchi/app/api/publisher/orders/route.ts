import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  return withErrors(async () => {
    const user = await requireAuth();

    const orders = await prisma.order.findMany({
      where: {
        page: { ownerId: user.id }, // فقط پیج‌های همین کاربر
        status: "REQUESTED"
      },
      include: {
        campaign: {
          select: {
            title: true,
            description: true,
            // ⚠️ نکته امنیتی: لینک (link) و نام کسب‌وکار (business) رو نمی‌آریم تا مخفی بمونه!
            mediaUrl: true,
            mediaKind: true,
            publishType: true
          }
        },
        page: {
          select: { title: true } // اسم پیج خودش
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(orders);
  });
}