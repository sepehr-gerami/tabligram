import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { assertSameOrigin, clientIp, readJson, tooManyRequests, withErrors } from "@/lib/api";
import { hit } from "@/lib/rate-limit";
import { nextStep, type Actor } from "@/lib/money-rules";
import { commitOrderStep, notify } from "@/lib/order-transition";
import type { PagePublishType } from "@/lib/page-rules";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** ثبت اختلاف توسط هر یک از دو طرف سفارش؛ پول تا تصمیم مدیر منجمد می‌شود. */
export async function POST(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await params;

    const limited = hit(`order:dispute:${user.id}`, 20, 60 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

    const body = await readJson(req, 8_192);
    if (!body) throw new HttpError(400, "درخواست نامعتبر است.");
    const reason = typeof body.reason === "string" ? body.reason.replace(/\s+/g, " ").trim() : "";
    if (reason.length < 10 || reason.length > 1000) {
      return NextResponse.json({ error: "دلیل اختلاف باید بین ۱۰ تا ۱۰۰۰ حرف باشد.", fields: { reason: "توضیح کامل‌تری بنویسید." } }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        hold: true,
        campaign: { select: { advertiserId: true } },
        page: { select: { ownerId: true } },
      },
    });
    if (!order) return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });

    const isAdvertiser = order.campaign.advertiserId === user.id;
    const isOwner = order.page.ownerId === user.id;
    if (!isAdvertiser && !isOwner) throw new HttpError(403, "این سفارش متعلق به شما نیست.");

    const now = new Date();
    const step = nextStep({
      action: "dispute",
      actor: (isAdvertiser ? "ADVERTISER" : "OWNER") as Actor,
      now,
      order: {
        status: order.status,
        publishType: order.publishType as PagePublishType,
        respondByAt: order.respondByAt,
        publishDeadlineAt: order.publishDeadlineAt,
        proofSubmittedAt: order.proofSubmittedAt,
      },
      hold: order.hold,
    });
    if (!step.ok) throw new HttpError(400, step.error);

    await commitOrderStep({
      orderId: order.id,
      expectedOrderStatus: order.status,
      holdId: order.hold?.id ?? null,
      expectedHoldStatus: order.hold?.status ?? null,
      step,
      now,
      holdData: { disputeNote: reason },
      extra: async (tx) => {
        await tx.report.create({
          data: {
            kind: "ORDER_DISPUTE",
            reporterId: user.id,
            reportedUserId: isAdvertiser ? order.page.ownerId : order.campaign.advertiserId,
            disputeOrderId: order.id,
            subject: "اختلاف در سفارش تبلیغ",
            body: reason,
            status: "OPEN",
          },
        });
        await notify(
          tx,
          isAdvertiser ? order.page.ownerId : order.campaign.advertiserId,
          "اختلاف در سفارش ثبت شد",
          "طرف مقابل برای این سفارش اختلاف ثبت کرده است. مبلغ تا تصمیم مدیر منجمد می‌ماند.",
        );
      },
    });

    return NextResponse.json({ message: "اختلاف ثبت شد؛ مبلغ تا بررسی مدیر منجمد می‌ماند.", status: step.orderStatus });
  });
}
