export type CampaignStatus = "pending" | "running" | "completed" | "rejected";
export type PublishType = "story" | "post" | "reels";
export type CategoryId = "fashion" | "food" | "tech" | "beauty" | "travel";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type OfferStatus = "new" | "accepted" | "rejected";
export type PublishStatus = "awaiting" | "published" | "failed";

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
  category: CategoryId;
  region: string;
  notes: string;
  status: CampaignStatus;
  createdAt: string;
  mine: boolean;
  assignments: Assignment[];
}

export interface InstaPage {
  id: string;
  handle: string;
  url: string;
  category: CategoryId;
  city: string;
  followers: number;
  price: number;
  publishTypes: PublishType[];
  approval: ApprovalStatus;
  owned: boolean;
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
}
