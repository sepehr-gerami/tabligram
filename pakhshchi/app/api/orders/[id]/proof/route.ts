import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { nextStep } from "@/lib/money-rules";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    
    const postLink = body.postLink; // لینک پست منتشر شده
    const statsImage = body.statsImage; // لینک اسکرین‌شات آمار
    const caption = body.caption || "";

    if (!postLink || !statsImage) {
      return NextResponse.json({ error: "لینک پست و اسکرین‌شات آمار الزامی است." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { hold: true, page: true }
    });

    if (!order) return NextResponse.json({ error: "سفارش یافت نشد." }, { status: 404 });
    if (order.page.ownerId !== user.id) return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });

    const now = new Date();
    const stepResult = nextStep({
      action: "submit_proof",
      actor: "OWNER",
      now,
      order: {
        status: order.status,
        publishType: order.publishType as "story" | "post" | "reels",
        respondByAt: order.respondByAt,
        publishDeadlineAt: order.publishDeadlineAt,
        proofSubmittedAt: order.proofSubmittedAt,
      },
      hold: order.hold,
      proof: { hasPostLink: !!postLink, hasStatsScreenshot: !!statsImage }
    });

    if (!stepResult.ok) {
      return NextResponse.json({ error: stepResult.error }, { status: 400 });
    }

    // ثبت در دیتابیس
    await prisma.$transaction(async (tx) => {
      // 1. ثبت مدرک (OrderProof)
      await tx.orderProof.createMany({
        data: [
          { orderId: order.id, kind: "POST_LINK", proofUrl: postLink, caption },
          { orderId: order.id, kind: "STATS_SCREENSHOT", proofUrl: statsImage, caption }
        ]
      });

      // 2. آپدیت وضعیت سفارش
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: stepResult.orderStatus, // می‌شود PUBLISHED
          proofSubmittedAt: now,
        }
      });
    });

    return NextResponse.json({ message: "مدرک با موفقیت ثبت شد و برای تبلیغ‌دهنده ارسال گردید." });
  });
}