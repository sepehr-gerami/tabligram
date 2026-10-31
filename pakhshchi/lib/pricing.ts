/**
 * Pricing helpers: CPM maths and small-page packages.
 * All amounts are Toman integers. Tunables live here — components never
 * repeat these numbers.
 */
import type { InstaPage, PublishType } from "@/types";

/** Reference CPM bands (Toman per 1000 reached viewers), used for pricing advice. */
export const CPM_BANDS = [
  { maxFollowers: 10_000, cpm: 120_000 },
  { maxFollowers: 50_000, cpm: 90_000 },
  { maxFollowers: 200_000, cpm: 70_000 },
  { maxFollowers: Infinity, cpm: 55_000 },
] as const;

/** CPM advice for a page size, based on its *verified-or-claimed* reach. */
export function suggestedCpm(p: InstaPage): number {
  const band = CPM_BANDS.find((b) => p.followers <= b.maxFollowers) ?? CPM_BANDS[CPM_BANDS.length - 1];
  return band.cpm;
}

/** Reach estimate used for CPM: real views when available, else follower count. */
export const estimatedReach = (p: InstaPage, type: PublishType) => {
  if (type === "story") return p.avgStoryViews > 0 ? p.avgStoryViews : Math.round(p.followers * 0.08);
  return p.avgPostViews > 0 ? p.avgPostViews : Math.round(p.followers * 0.25);
};

/** CPM of a listed tariff (Toman per 1000 estimated viewers). */
export function pageCpm(p: InstaPage, type: PublishType, price: number): number | null {
  const reach = estimatedReach(p, type);
  if (reach <= 0 || price <= 0) return null;
  return Math.round((price / reach) * 1000);
}

/** Fair-price suggestion from the CPM band. */
export function suggestedPrice(p: InstaPage, type: PublishType): number {
  const reach = estimatedReach(p, type);
  return Math.max(50_000, Math.round((reach * suggestedCpm(p)) / 1000 / 10_000) * 10_000);
}

/** Small pages get bundled discounts: buying N publishes costs less per unit. */
export interface BundleTier { count: number; discount: number; label: string }
export const SMALL_PAGE_THRESHOLD = 20_000;
export const BUNDLE_TIERS: BundleTier[] = [
  { count: 1, discount: 0, label: "تک‌پست" },
  { count: 3, discount: 0.1, label: "بستهٔ ۳ انتشار" },
  { count: 5, discount: 0.18, label: "بستهٔ ۵ انتشار" },
];

export const bundleFor = (count: number): BundleTier =>
  [...BUNDLE_TIERS].reverse().find((t) => count >= t.count) ?? BUNDLE_TIERS[0];

export const bundlePrice = (unit: number, count: number) => {
  const tier = bundleFor(count);
  return Math.round(unit * count * (1 - tier.discount));
};

export const isSmallPage = (p: InstaPage) => p.followers <= SMALL_PAGE_THRESHOLD;
