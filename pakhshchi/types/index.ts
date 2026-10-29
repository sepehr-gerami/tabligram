export type CampaignStatus = "pending" | "running" | "completed" | "rejected";
export type PublishType = "story" | "post" | "reels";
/** Category identifiers live in ONE place: `lib/categories.ts` (CATEGORIES). */
export type CategoryId =
  | "fashion" | "food" | "tech" | "beauty" | "travel" | "sport" | "education" | "health"
  | "home" | "auto" | "kids" | "fun" | "art" | "business" | "realestate" | "finance" | "other";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type OfferStatus = "new" | "accepted" | "rejected";
export type PublishStatus = "awaiting" | "published" | "failed";
export type StoryStatus = "active" | "expired" | "disabled";

export interface Assignment {
  pageId: string;
  status: PublishStatus;
  proofUrl: string;
}

export interface Campaign {
  id: string;
  orderNumber: string;
  title: string;
  business: string;
  description: string;
  link: string;
  mediaName: string | null;
  mediaKind: "image" | "video" | null;
  budget: number;
  count: number;
  publishType: PublishType;
  category: CategoryId | null;
  region: string;
  notes: string;
  status: CampaignStatus;
  createdAt: string;
  mine: boolean;
  assignments: Assignment[];
  /** Page the advertiser picked before submitting (preview only, no offer is created from it). */
  selectedPageId: string | null;
}

export interface InstaPage {
  id: string;
  handle: string;
  /** Display name of the page; falls back to the handle when absent. */
  title: string;
  url: string;
  category: CategoryId | null;
  city: string;
  bio: string;
  followers: number;
  /** Average story views and post/reels views, as entered by the page owner. */
  avgStoryViews: number;
  avgPostViews: number;
  /** Story / post / reels prices in Toman. 0 means "not offered". */
  prices: Record<PublishType, number>;
  publishTypes: PublishType[];
  approval: ApprovalStatus;
  /** Rejection reason shown to the owner when approval === "rejected". */
  rejectReason: string;
  /** Stable owner identity. Replaced by the authenticated user id once a backend exists. */
  ownerId: string | null;
  createdAt: string;
  /** Object URL of the picked profile image; preview only, never persisted. */
  avatarUrl: string | null;
  /**
   * Demo flag kept from the original model: true for pages seeded as "the visitor's own".
   * Not a security control — ownership checks must use ownerId (and a backend later).
   */
  owned: boolean;
}

export interface Story {
  id: string;
  pageId: string;
  ownerId: string | null;
  caption: string;
  /** Object URL of the picked image; preview only, never persisted. */
  mediaUrl: string | null;
  mediaKind: "image" | "video" | null;
  createdAt: string;
  /** ISO time; stories are active until then. */
  expiresAt: string;
  /** Set by the owner; a disabled story is hidden even before it expires. */
  disabled: boolean;
}

export interface Offer {
  id: string;
  campaignId: string | null;
  pageId: string | null;
  campaignTitle: string;
  business: string;
  topic: string;
  amount: number;
  publishType: PublishType;
  deadline: string;
  status: OfferStatus;
}

export interface StoreState {
  campaigns: Campaign[];
  pages: InstaPage[];
  offers: Offer[];
  stories: Story[];
}
