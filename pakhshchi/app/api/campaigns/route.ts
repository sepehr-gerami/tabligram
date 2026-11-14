import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { assertSameOrigin, clientIp, readJson, tooManyRequests, withErrors } from "@/lib/api";
import { hit } from "@/lib/rate-limit";
import { ensureAdvertiserProfile } from "@/lib/profiles";
import { CAMPAIGN_LIMITS, parseCampaignInput } from "@/lib/campaign-rules";
import { MAX_PAGES_PER_CAMPAIGN, INSUFFICIENT_FUNDS } from "@/lib/dispatch-rules";
import { dispatchCampaign, createOrderRequest, isPublishType } from "@/lib/order-service";
import { walletSummary } from "@/lib/wallet";
import { isSafeImageUrl } from "@/lib/image-rules";

export const runtime = "nodejs";

const newOrderNumber = () => `CMP-${Math.floor(1000000 + Math.random() * 9000000)}`;

/** کمپین‌های من با سفارش‌ها، بلوکه‌ها و بودجهٔ باقی‌مانده. */
export async function GET() {
  return withErrors(async () => {
    const user = await requireUser();
    const campaigns = await prisma.campaign.findMany({
      where: { advertiserId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            page: { select: { id: true, title: true, handle: true, category: true, avatarUrl: true, ownerId: true } },
            hold: { select: { status: true, amount: true, commission: true, publisherAmount: true, payoutDueAt: true } },
          },
        },
      },
    });

    const data = campaigns.map((c) => {
      const blocked = c.orders.reduce((s, o) => (o.hold && o.hold.status !== "REFUNDED" ? s + o.hold.amount : s), 0);
      return {
        id: c.id,
        orderNumber: c.orderNumber,
        title: c.title,
        business: c.business,
        description: c.description,
        budget: c.budget,
        pageCount: c.pageCount,
        publishTypes: c.publishTypes,
        category: c.category,
        city: c.city,
        status: c.status,
        createdAt: c.createdAt,
        blocked,
        remainingBudget: Math.max(0, c.budget - blocked),
        orders: c.orders.map((o) => ({
          id: o.id,
          status: o.status,
          amount: o.amount,
          publishType: o.publishType,
          createdAt: o.createdAt,
          respondByAt: o.respondByAt,
          publishDeadlineAt: o.publishDeadlineAt,
          proofSubmittedAt: o.proofSubmittedAt,
          closedReason: o.closedReason,
          page: { id: o.page.id, title: o.page.title, handle: o.page.handle, category: o.page.category, avatarUrl: o.page.avatarUrl },
          hold: o.hold,
        })),
      };
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  });
}

/**
 * ثبت کمپین + بلوکه‌کردن خودکار بودجه بین پیج‌های واجد شرایط.
 * - ورود الزامی است و پروفایل تبلیغ‌کننده در همین لحظه ساخته می‌شود.
 * - موجودی آزاد باید کل بودجه را پوشش دهد؛ سپس برای هر پیج یک Hold ثبت می‌شود.
 */
export async function POST(req: Request) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    const limited = hit(`campaign:create:${user.id}:${clientIp(req)}`, 10, 60 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

    const body = await readJson(req, 32_768);
    if (!body) throw new HttpError(400, "درخواست نامعتبر است.");

    const parsed = parseCampaignInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: Object.values(parsed.errors)[0], fields: parsed.errors }, { status: 400 });
    }

    const pageCountRaw = body.pageCount ?? body.count ?? 1;
    const pageCount = typeof pageCountRaw === "number" ? pageCountRaw : Number(pageCountRaw);
    if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > MAX_PAGES_PER_CAMPAIGN) {
      return NextResponse.json({ error: `تعداد پیج باید بین ۱ تا ${MAX_PAGES_PER_CAMPAIGN} باشد.`, fields: { pageCount: "تعداد پیج معتبر نیست." } }, { status: 400 });
    }

    const targetPageId = typeof body.targetPageId === "string" && /^[A-Za-z0-9_-]{10,40}$/.test(body.targetPageId)
      ? body.targetPageId : null;
    let targetType: string | null = typeof body.targetPublishType === "string" ? body.targetPublishType : null;
    if (targetPageId && !isPublishType(targetType)) targetType = null;

    if (parsed.data.mediaUrl && !isSafeImageUrl(parsed.data.mediaUrl)) {
      return NextResponse.json({ error: "آدرس تصویر معتبر نیست.", fields: { mediaUrl: "آدرس تصویر معتبر نیست." } }, { status: 400 });
    }

    const wallet = await walletSummary(user.id);
    if (wallet.available < parsed.data.budget) {
      throw new HttpError(400, INSUFFICIENT_FUNDS);
    }

    await ensureAdvertiserProfile(user.id, parsed.data.business);

    let campaign;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        campaign = await prisma.campaign.create({
          data: {
            orderNumber: newOrderNumber(),
            advertiserId: user.id,
            title: parsed.data.title,
            business: parsed.data.business,
            description: parsed.data.description,
            link: parsed.data.link,
            mediaUrl: parsed.data.mediaUrl,
            mediaKind: parsed.data.mediaUrl ? "image" : null,
            budget: parsed.data.budget,
            pageCount,
            category: parsed.data.category,
            city: parsed.data.city,
            notes: parsed.data.notes,
            publishType: parsed.data.publishTypes[0],
            publishTypes: parsed.data.publishTypes.join(","),
            status: "APPROVED",
          },
        });
        break;
      } catch {
        campaign = undefined;
      }
    }
    if (!campaign) throw new HttpError(500, "ساخت کمپین ناموفق بود؛ دوباره تلاش کنید.");

    let directOrderCreated = false;
    if (targetPageId && isPublishType(targetType)) {
      try {
        await createOrderRequest({
          advertiserId: user.id,
          campaignId: campaign.id,
          pageId: targetPageId,
          publishType: targetType,
        });
        directOrderCreated = true;
      } catch {
        // پیج انتخابی واجد شرایط نبود؛ توزیع خودکار ادامه می‌یابد.
      }
    }

    const dispatch = await dispatchCampaign(campaign.id, user.id);
    const updated = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      select: { id: true, orderNumber: true, status: true, budget: true, pageCount: true },
    });

    return NextResponse.json(
      {
        campaign: updated,
        dispatch: {
          created: dispatch.created + (directOrderCreated ? 1 : 0),
          amount: dispatch.amount,
          remainingBudget: dispatch.remainingBudget,
        },
        message:
          dispatch.created + (directOrderCreated ? 1 : 0) > 0
            ? "کمپین ثبت شد و درخواست‌ها برای صاحبان پیج ارسال شد؛ مبلغ سفارش‌ها بلوکه شده است."
            : "کمپین ثبت شد. در حال حاضر پیج واجد شرایطی پیدا نشد؛ از بازار پیج‌ها پیشنهاد بفرستید.",
      },
      { status: 201 },
    );
  });
}
