import type { ApprovalStatus, CampaignStatus, OfferStatus, PublishStatus, PublishType } from "@/types";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";
type Meta = { label: string; tone: Tone; color: string };

// Categories are defined once in lib/categories.ts and re-exported here so the
// many existing `from "@/lib/constants"` imports keep working.
export { CATEGORIES, categoryLabel } from "@/lib/categories";

export const PUBLISH_TYPES: { value: PublishType; label: string }[] = [
  { value: "story", label: "استوری" },
  { value: "post", label: "پست" },
  { value: "reels", label: "ریلز" },
];

export const typeLabel = (v: PublishType) => PUBLISH_TYPES.find((c) => c.value === v)?.label ?? v;

export const CAMPAIGN_STATUS: Record<CampaignStatus, Meta> = {
  pending: { label: "در انتظار بررسی", tone: "warning", color: "#f59e0b" },
  running: { label: "در حال اجرا", tone: "info", color: "#2563eb" },
  completed: { label: "تکمیل‌شده", tone: "success", color: "#16a34a" },
  rejected: { label: "ردشده", tone: "danger", color: "#dc2626" },
};

export const APPROVAL_STATUS: Record<ApprovalStatus, Meta> = {
  pending: { label: "در انتظار تأیید", tone: "warning", color: "#f59e0b" },
  approved: { label: "تأییدشده", tone: "success", color: "#16a34a" },
  rejected: { label: "ردشده", tone: "danger", color: "#dc2626" },
};

export const OFFER_STATUS: Record<OfferStatus, Meta> = {
  new: { label: "جدید", tone: "info", color: "#2563eb" },
  accepted: { label: "پذیرفته‌شده", tone: "success", color: "#16a34a" },
  rejected: { label: "ردشده", tone: "danger", color: "#dc2626" },
};

export const PUBLISH_STATUS: Record<PublishStatus, Meta> = {
  awaiting: { label: "در انتظار انتشار", tone: "warning", color: "#f59e0b" },
  published: { label: "منتشر شد", tone: "success", color: "#16a34a" },
  failed: { label: "ناموفق", tone: "danger", color: "#dc2626" },
};

export const ACCEPTED_MEDIA = ["image/jpeg", "image/png", "image/webp", "video/mp4"];
export const ACCEPTED_IMAGES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_FILE_MB = 20;
export const MAX_AVATAR_MB = 3;
export const MIN_BUDGET = 500_000;

/** Each publisher (owner) may register at most this many pages, pending ones included. */
export const MAX_PAGES_PER_OWNER = 5;

/**
 * A page tariff at or above this amount is treated as "relatively high" when the
 * advertiser picks it; the budget rule below is shown before continuing.
 * Tunable in one place — do not repeat the number across components.
 */
export const HIGH_TARIFF_THRESHOLD = 1_000_000;

/** Stories behave like social stories: they stop being public after this long. */
export const STORY_LIFETIME_HOURS = 24;
