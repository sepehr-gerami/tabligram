import { initialState } from "@/lib/data";
import type { Campaign, CategoryId, InstaPage, PublishType } from "@/types";

export interface BannerSlide {
  id: string;
  business: string;
  title: string;
  text: string;
  category: CategoryId;
  publishType: PublishType;
  handle: string;
  likes: number;
  comments: number;
}

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function toSlide(c: Campaign, pages: InstaPage[]): BannerSlide {
  const assigned = c.assignments.map((a) => pages.find((p) => p.id === a.pageId)).find(Boolean);
  const page = assigned ?? pages.find((p) => p.category === c.category && p.approval === "approved");
  const h = hash(c.id);
  return {
    id: c.id, business: c.business, title: c.title, text: c.description, category: c.category, publishType: c.publishType,
    handle: page?.handle ?? "@pakhshchi_sample", likes: 800 + (h % 3200), comments: 20 + (h % 180),
  };
}

/** Banner slides come from running/completed campaigns; sample campaigns fill in when there are fewer than three. */
export function buildSlides(campaigns: Campaign[], pages: InstaPage[], max = 5): BannerSlide[] {
  const picked = campaigns
    .filter((c) => c.status === "running" || c.status === "completed")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, max);
  for (const c of initialState.campaigns) {
    if (picked.length >= 3) break;
    if (c.status !== "rejected" && !picked.some((x) => x.id === c.id)) picked.push(c);
  }
  return picked.map((c) => toSlide(c, pages));
}
