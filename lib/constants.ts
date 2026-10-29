import type {
  ApprovalStatus, CampaignStatus, CategoryId, OfferStatus, PublishStatus, PublishType,
} from "@/types";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";
type Meta = { label: string; tone: Tone; color: string };

export const CATEGORIES: { value: CategoryId; label: string }[] = [
  { value: "fashion", label: "پوشاک" },
  { value: "food", label: "غذا" },
  { value: "tech", label: "فناوری" },
  { value: "beauty", label: "زیبایی" },
  { value: "travel", label: "گردشگری" },
];

export const PUBLISH_TYPES: { value: PublishType; label: string }[] = [
  { value: "story", label: "استوری" },
  { value: "post", label: "پست" },
  { value: "reels", label: "ریلز" },
];

export const categoryLabel = (v: CategoryId) => CATEGORIES.find((c) => c.value === v)?.label ?? v;
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
export const MAX_FILE_MB = 20;
export const MIN_BUDGET = 500_000;
