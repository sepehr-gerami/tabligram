import { isDemoOwner } from "@/lib/identity";
import type { InstaPage, PublishType } from "@/types";

/** A page may only be ordered/edited while it is approved. */
export const isPublicPage = (p: InstaPage) => p.approval === "approved";

/** Pages the current (demo) publisher owns — pending and rejected included. */
export const ownedPages = (pages: InstaPage[]) => pages.filter((p) => isDemoOwner(p.ownerId) || p.owned);

/** Pages an advertiser may see: approved, and never the ones already claimed by the demo owner. */
export const advertiserPages = (pages: InstaPage[]) =>
  pages.filter((p) => isPublicPage(p) && !ownedPages(pages).some((o) => o.id === p.id));

/** Tariff of a page for a given publish type; 0 means the page does not offer it. */
export const pagePrice = (p: InstaPage, type: PublishType) =>
  p.publishTypes.includes(type) ? p.prices[type] ?? 0 : 0;

/** Cheapest offered tariff; falls back to the story price. */
export const minPagePrice = (p: InstaPage) => {
  const prices = p.publishTypes.map((t) => pagePrice(p, t)).filter((n) => n > 0);
  return prices.length ? Math.min(...prices) : 0;
};

/** Short tariff summary for admin lists, e.g. "استوری ۱٬۲۰۰٬۰۰۰ · پست ۱٬۵۰۰٬۰۰۰". */
export const priceSummary = (p: InstaPage) => {
  const parts = p.publishTypes.filter((t) => p.prices[t] > 0).map((t) => `${TYPE_LABELS[t]} ${p.prices[t].toLocaleString("fa-IR")}`);
  return parts.length ? parts.join(" · ") : "تعرفه ثبت نشده";
};

const TYPE_LABELS = { story: "استوری", post: "پست", reels: "ریلز" } as const;
