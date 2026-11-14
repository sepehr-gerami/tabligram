// سرویس مشترک ساخت درخواست/بلوکه و توزیع خودکار کمپین.
// همهٔ توابع پول داخل withKeyLock و تراکنش اجرا می‌شوند و قوانین را از lib دوباره بررسی می‌کنند.
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/auth";
import { DEFAULT_COMMISSION_BPS, splitCommission } from "@/lib/commission";
import { planDispatch, MAX_PAGES_PER_CAMPAIGN, type DispatchPage } from "@/lib/dispatch-rules";
import { addHours, availableBalance, CAMPAIGN_OPEN_STATUSES, checkHoldRequest, POLICY } from "@/lib/money-rules";
import { campaignTypes } from "@/lib/campaign-rules";
import { PAGE_PUBLISH_TYPES, type PagePublishType } from "@/lib/page-rules";
import { withKeyLock } from "@/lib/mutex";
import { campaignBlockedAmount, walletSummary } from "@/lib/wallet";

type Tx = Prisma.TransactionClient;

export const isPublishType = (v: unknown): v is PagePublishType =>
  typeof v === "string" && (PAGE_PUBLISH_TYPES as readonly string[]).includes(v);

/** تعداد سفارش‌های «فعال» کمپین؛ سفارش‌های رد/لغوشده جای پیج را آزاد می‌کنند. */
const activeOrderWhere: Prisma.OrderWhereInput = { status: { notIn: ["DECLINED", "CANCELLED"] } };

/** ساخت یک سفارش REQUESTED + بلوکهٔ HELD برای یک پیج مشخص. */
export async function createOrderRequest(input: {
  advertiserId: string;
  campaignId: string;
  pageId: string;
  publishType: PagePublishType;
  commissionBps?: number;
}): Promise<{ orderId: string; amount: number; commission: number; publisherAmount: number }> {
  if (!isPublishType(input.publishType)) throw new HttpError(400, "نوع انتشار معتبر نیست.");

  return withKeyLock(`wallet:${input.advertiserId}`, () =>
    prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.findFirst({
        where: { id: input.campaignId, advertiserId: input.advertiserId },
      });
      if (!campaign) throw new HttpError(404, "کمپین پیدا نشد.");
      if (!CAMPAIGN_OPEN_STATUSES.includes(campaign.status)) throw new HttpError(400, "این کمپین فعال نیست.");

      const page = await tx.instaPage.findUnique({ where: { id: input.pageId } });
      if (!page) throw new HttpError(404, "پیج پیدا نشد.");

      const duplicate = await tx.order.findUnique({
        where: { campaignId_pageId: { campaignId: campaign.id, pageId: page.id } },
      });
      if (duplicate) throw new HttpError(409, "برای این پیج در این کمپین قبلاً درخواست ثبت شده است.");

      const activeOrders = await tx.order.count({
        where: { campaignId: campaign.id, ...activeOrderWhere },
      });
      const pageLimit = Math.min(Math.max(campaign.pageCount, 1), MAX_PAGES_PER_CAMPAIGN);
      if (activeOrders >= pageLimit) {
        throw new HttpError(400, `این کمپین حداکثر ${pageLimit} پیج می‌پذیرد؛ تعداد پیج را در کمپین افزایش دهید.`);
      }

      const [deposits, holds, ownerCompletedOrders] = await Promise.all([
        tx.deposit.findMany({ where: { userId: input.advertiserId, status: "VERIFIED" }, select: { amount: true } }),
        tx.hold.findMany({ where: { advertiserId: input.advertiserId }, select: { amount: true, status: true } }),
        tx.order.count({ where: { pageId: page.id, status: "PAID_FULL" } }),
      ]);
      const available = availableBalance(
        deposits.map((d) => d.amount),
        holds,
      );
      const blocked = await campaignBlockedAmount(campaign.id, tx);

      const check = checkHoldRequest({
        advertiserId: input.advertiserId,
        page: {
          priceStory: page.priceStory,
          pricePost: page.pricePost,
          priceReels: page.priceReels,
          ownerId: page.ownerId,
          status: page.status,
          category: page.category,
        },
        type: input.publishType,
        campaign: {
          advertiserId: campaign.advertiserId,
          budget: campaign.budget,
          category: campaign.category,
          publishTypes: campaignTypes(campaign),
          status: campaign.status,
        },
        campaignActiveHolds: blocked,
        available,
        ownerCompletedOrders,
      });
      if (!check.ok) throw new HttpError(400, check.error);

      const split = splitCommission(check.amount, input.commissionBps ?? DEFAULT_COMMISSION_BPS);
      const now = new Date();
      const order = await tx.order.create({
        data: {
          campaignId: campaign.id,
          pageId: page.id,
          amount: check.amount,
          publishType: input.publishType,
          status: "REQUESTED",
          respondByAt: addHours(now, POLICY.respondHours),
        },
      });
      await tx.hold.create({
        data: {
          orderId: order.id,
          advertiserId: input.advertiserId,
          amount: check.amount,
          commissionBps: input.commissionBps ?? DEFAULT_COMMISSION_BPS,
          commission: split.commission,
          publisherAmount: split.publisherAmount,
          status: "HELD",
        },
      });
      if (campaign.status === "APPROVED") {
        await tx.campaign.update({ where: { id: campaign.id }, data: { status: "RUNNING" } });
      }
      return { orderId: order.id, amount: check.amount, ...split };
    }),
  );
}

export interface DispatchResult {
  created: number;
  amount: number;
  remainingBudget: number;
}

/**
 * توزیع خودکار کمپین بین پیج‌های تأییدشده.
 * فقط تا سقف pageCount، بودجهٔ باقی‌مانده و موجودی آزاد کیف پول سفارش می‌سازد.
 * idempotent است: پیج‌هایی که قبلاً سفارش دارند دوباره انتخاب نمی‌شوند.
 */
export async function dispatchCampaign(campaignId: string, advertiserId: string): Promise<DispatchResult> {
  return withKeyLock(`wallet:${advertiserId}`, () =>
    prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.findFirst({ where: { id: campaignId, advertiserId } });
      if (!campaign) throw new HttpError(404, "کمپین پیدا نشد.");
      if (!CAMPAIGN_OPEN_STATUSES.includes(campaign.status)) throw new HttpError(400, "این کمپین فعال نیست.");

      const pageLimit = Math.min(Math.max(campaign.pageCount, 1), MAX_PAGES_PER_CAMPAIGN);
      const [activeOrders, blocked, wallet, pages, existingOrders] = await Promise.all([
        tx.order.count({ where: { campaignId, ...activeOrderWhere } }),
        campaignBlockedAmount(campaignId, tx),
        walletSummary(advertiserId, tx),
        tx.instaPage.findMany({ where: { status: "APPROVED" }, select: { id: true, ownerId: true, category: true, status: true, followers: true, priceStory: true, pricePost: true, priceReels: true } }),
        tx.order.findMany({ where: { campaignId }, select: { pageId: true } }),
      ]);
      const remainingSlots = Math.max(0, pageLimit - activeOrders);
      if (remainingSlots === 0) return { created: 0, amount: 0, remainingBudget: Math.max(0, campaign.budget - blocked) };

      const completed = await tx.order.groupBy({
        by: ["pageId"],
        where: { pageId: { in: pages.map((p) => p.id) }, status: "PAID_FULL" },
        _count: { _all: true },
      });
      const completedMap = new Map(completed.map((c) => [c.pageId, c._count._all]));
      const eligible: DispatchPage[] = pages.map((p) => ({
        ...p,
        ownerCompletedOrders: completedMap.get(p.id) ?? 0,
      }));

      const budgetAvailable = Math.min(campaign.budget, blocked + Math.max(0, wallet.available));
      const plan = planDispatch({
        pages: eligible,
        campaign: {
          advertiserId,
          category: campaign.category,
          publishTypes: campaignTypes(campaign),
          budget: budgetAvailable,
        },
        alreadyBlocked: blocked,
        existingPageIds: existingOrders.map((o) => o.pageId),
        maxPages: remainingSlots,
      });
      if (plan.candidates.length === 0) {
        return { created: 0, amount: 0, remainingBudget: Math.max(0, campaign.budget - blocked) };
      }

      const now = new Date();
      let createdAmount = 0;
      for (const candidate of plan.candidates) {
        const split = splitCommission(candidate.amount);
        const order = await tx.order.create({
          data: {
            campaignId,
            pageId: candidate.pageId,
            amount: candidate.amount,
            publishType: candidate.publishType,
            status: "REQUESTED",
            respondByAt: addHours(now, POLICY.respondHours),
          },
        });
        await tx.hold.create({
          data: {
            orderId: order.id,
            advertiserId,
            amount: candidate.amount,
            commissionBps: DEFAULT_COMMISSION_BPS,
            commission: split.commission,
            publisherAmount: split.publisherAmount,
            status: "HELD",
          },
        });
        createdAmount += candidate.amount;
      }
      if (campaign.status === "APPROVED") {
        await tx.campaign.update({ where: { id: campaignId }, data: { status: "RUNNING" } });
      }
      return {
        created: plan.candidates.length,
        amount: createdAmount,
        remainingBudget: Math.max(0, campaign.budget - blocked - createdAmount),
      };
    }),
  );
}

/** برگرداندن بلوکه به کیف پول؛ فقط از وضعیت‌های مجاز و به‌صورت شرطی. */
export async function refundHold(tx: Tx, orderId: string, reason: string, now = new Date()): Promise<boolean> {
  const result = await tx.hold.updateMany({
    where: { orderId, status: { in: ["HELD", "PAYOUT_DUE", "DISPUTED"] } },
    data: { status: "REFUNDED", refundedAt: now, refundReason: reason },
  });
  return result.count === 1;
}

/** آمار سبک برای پنل‌ها. */
export async function advertiserStats(userId: string, db: PrismaClient = prisma) {
  const [campaigns, orders, wallet] = await Promise.all([
    db.campaign.count({ where: { advertiserId: userId } }),
    db.order.count({ where: { campaign: { advertiserId: userId } } }),
    walletSummary(userId, db),
  ]);
  return { campaigns, orders, wallet };
}
