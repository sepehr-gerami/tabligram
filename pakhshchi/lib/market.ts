// شکل دادهٔ عمومی پیج در بازار و کمک‌تابع‌های تعرفه. هیچ دادهٔ خصوصی (ownerId/url/آواتار خام) در این نوع نیست.
import type { CategoryId, PublishType } from "@/types";

export interface MarketPage {
  id: string;
  handle: string;
  url: string | null;
  title: string;
  category: CategoryId;
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
  publishTypes: PublishType[];
  verified: boolean;
}

export const marketPrice = (p: Pick<MarketPage, "priceStory" | "pricePost" | "priceReels">, type: PublishType): number =>
  type === "story" ? p.priceStory : type === "post" ? p.pricePost : p.priceReels;

export const marketMinPrice = (p: MarketPage): number => {
  const prices = p.publishTypes.map((t) => marketPrice(p, t)).filter((n) => n > 0);
  return prices.length > 0 ? Math.min(...prices) : 0;
};
