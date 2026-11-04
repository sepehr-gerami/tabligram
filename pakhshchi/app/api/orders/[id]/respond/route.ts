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
    const { action } = await req.json();

    if (action !== "accept" && action !== "decline") {
      return NextResponse.json({ error: "عملیات نامعتبر است." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { 
        hold: true,
        page: true
      }
    });

    if (!order) return NextResponse.json({ error: "سفارش یافت نشد." }, { status: 404 });
    if (order.page.ownerId !== user.id) return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });

    const now = new Date();
    
    const stepResult = nextStep({
      action: action,
      actor: "OWNER",
      now,
      order: {
        status: order.status,
        publishType: order.publishType as "story" | "post" | "reels",
        respondByAt: order.respondByAt,
        publishDeadlineAt: order.publishDeadlineAt,
        proofSubmittedAt: order.proofSubmittedAt,
      },
      hold: order.hold
    });

    if (!stepResult.ok) {
      return NextResponse.json({ error: stepResult.error }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: stepResult.orderStatus,
          closedReason: stepResult.closedReason,
          ...(stepResult.reveal && { revealedAt: now }), 
          ...(stepResult.publishDeadlineAt && { publishDeadlineAt: stepResult.publishDeadlineAt }),
        }
      });

      if (order.hold) {
        await tx.hold.update({
          where: { id: order.hold.id },
          data: { 
            status: stepResult.holdStatus,
            ...(stepResult.holdStatus === "REFUNDED" && { refundedAt: now })
          }
        });
      }
    });

    return NextResponse.json({ 
      message: action === "accept" ? "درخواست پذیرفته شد. اطلاعات تماس آزاد شد." : "درخواست رد شد و مبلغ به تبلیغ‌دهنده برگشت خورد." 
    });
  });
}