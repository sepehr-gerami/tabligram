// DTO های عمومی/مشترک API. انتخاب صریح فیلدها تا هیچ وقت passwordHash یا توکن لو نرود.
import { offeredTypes, type PagePublishType } from "@/lib/page-rules";

export interface MarketPageSource {
  id: string;
  handle: string;
  url: string | null;
  title: string;
  category: string;
  city: string | null;
  bio: string | null;
  followers: number;
  avgStoryViews: number;
  avgPostViews: number;
  avgReelsViews: number;
  priceStory: number;
  pricePost: number;
  priceReels: number;
  avatarUrl: string | null;
  verification?: { status: string } | null;
}

export function toMarketPage(p: MarketPageSource) {
  return {
    id: p.id,
    handle: p.handle,
    url: p.url,
    title: p.title,
    category: p.category,
    city: p.city,
    bio: p.bio,
    followers: p.followers,
    avgStoryViews: p.avgStoryViews,
    avgPostViews: p.avgPostViews,
    avgReelsViews: p.avgReelsViews,
    priceStory: p.priceStory,
    pricePost: p.pricePost,
    priceReels: p.priceReels,
    avatarUrl: p.avatarUrl,
    publishTypes: offeredTypes(p),
    verified: p.verification?.status === "VERIFIED",
  };
}

export type MarketPageDto = ReturnType<typeof toMarketPage>;

export interface OrderViewSource {
  id: string;
  status: string;
  amount: number;
  publishType: string;
  createdAt: Date;
  respondByAt: Date | null;
  publishDeadlineAt: Date | null;
  proofSubmittedAt: Date | null;
  advertiserConfirmedAt: Date | null;
  revealedAt: Date | null;
  closedReason: string | null;
  campaign: { id: string; title: string; description: string; business: string; link: string; mediaUrl: string | null; publisher?: { id: string } | null };
  page: { id: string; title: string; handle: string; category: string; avatarUrl: string | null; ownerId: string };
  hold: { status: string; amount: number; commission: number; publisherAmount: number; payoutDueAt: Date | null } | null;
  proofs?: { kind: string; proofUrl: string; caption: string | null }[];
}

/** نمای سفارش با رعایت قانون مخفی‌ماندن کسب‌وکار/لینک تا لحظهٔ پذیرش. */
export function toOrderView(o: OrderViewSource, viewer: { isAdmin: boolean; isAdvertiser: boolean; isOwner: boolean }) {
  const revealed = o.revealedAt !== null || viewer.isAdmin || viewer.isAdvertiser;
  return {
    id: o.id,
    status: o.status,
    amount: o.amount,
    commission: o.hold?.commission ?? 0,
    publisherAmount: o.hold?.publisherAmount ?? o.amount,
    publishType: o.publishType,
    createdAt: o.createdAt,
    respondByAt: o.respondByAt,
    publishDeadlineAt: o.publishDeadlineAt,
    proofSubmittedAt: o.proofSubmittedAt,
    advertiserConfirmedAt: o.advertiserConfirmedAt,
    closedReason: o.closedReason,
    campaign: {
      id: o.campaign.id,
      title: o.campaign.title,
      description: o.campaign.description,
      business: revealed ? o.campaign.business : null,
      link: revealed ? o.campaign.link : null,
      mediaUrl: o.campaign.mediaUrl,
    },
    page: {
      id: o.page.id,
      title: o.page.title,
      handle: o.page.handle,
      category: o.page.category,
      avatarUrl: o.page.avatarUrl,
    },
    hold: o.hold
      ? { status: o.hold.status, amount: o.hold.amount, commission: o.hold.commission, publisherAmount: o.hold.publisherAmount, payoutDueAt: o.hold.payoutDueAt }
      : null,
    proofs: o.proofs ?? [],
    revealed,
  };
}

export type OrderViewDto = ReturnType<typeof toOrderView>;

export const publishTypeLabel = (t: string): string => ({ story: "استوری", post: "پست", reels: "ریلز" })[t] ?? t;
export const asPublishTypes = (list: string[]): PagePublishType[] => list.filter((t): t is PagePublishType => t === "story" || t === "post" || t === "reels");
