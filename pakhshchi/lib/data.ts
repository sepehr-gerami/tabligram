import { DEMO_USER_ID } from "@/lib/identity";
import { emptyVerification } from "@/lib/verification";
import type { Assignment, EscrowInfo, InstaPage, PublishType, StoreState } from "@/types";

const ig = (h: string) => `https://instagram.com/${h}`;

/** Sample data only. Handles, names, follower counts and tariffs are fictional. */

interface SeedPage {
  id: string; handle: string; title: string; category: InstaPage["category"]; city: string;
  followers: number; story: number; post: number; reels: number; approval: InstaPage["approval"];
  bio?: string; mine?: boolean;
}

/** Escrow helper for seeds: a share of the campaign budget held per assignment. */
const escrow = (amount: number, status: EscrowInfo["status"] = "held"): EscrowInfo =>
  ({ status, amount, heldAt: status === "held" ? "2026-10-20T09:00:00Z" : null,
    releasedAt: status === "released" ? "2026-10-23T09:00:00Z" : null, note: "" });

const seedAssignment = (pageId: string, status: Assignment["status"], proofUrl = "", amount: number): Assignment =>
  ({ pageId, status, proofUrl, escrow: escrow(amount, status === "published" ? "released" : "held") });

const seedPage = (s: SeedPage): InstaPage => {
  const prices: Record<PublishType, number> = { story: s.story, post: s.post, reels: s.reels };
  return {
    id: s.id, handle: s.handle, title: s.title, url: ig(s.handle.replace(/^@/, "")), category: s.category, city: s.city,
    bio: s.bio ?? "", followers: s.followers, avgStoryViews: Math.round(s.followers * 0.35), avgPostViews: Math.round(s.followers * 0.22),
    prices, publishTypes: (["story", "post", "reels"] as PublishType[]).filter((t) => prices[t] > 0),
    approval: s.approval, rejectReason: "", ownerId: s.mine ? DEMO_USER_ID : null, createdAt: "2026-10-01T09:00:00Z",
    avatarUrl: null, owned: !!s.mine,
    verification: emptyVerification(), statsSource: "self",
  };
};

export const initialState: StoreState = {
  pages: [
    seedPage({ id: "p1", handle: "@mode_dar_tehran", title: "مدِ تهران", category: "fashion", city: "تهران", followers: 182000, story: 1200000, post: 1500000, reels: 0, approval: "approved", bio: "پوشاک و استایل روزانهٔ زنانه" }),
    seedPage({ id: "p2", handle: "@lebas_baz", title: "لباس‌باز", category: "fashion", city: "شیراز", followers: 64000, story: 600000, post: 0, reels: 850000, approval: "approved" }),
    seedPage({ id: "p3", handle: "@tech_negar", title: "تک‌نگار", category: "tech", city: "تهران", followers: 240000, story: 0, post: 1800000, reels: 2200000, approval: "approved", bio: "اخبار و بررسی گجت‌ها" }),
    seedPage({ id: "p4", handle: "@donyaye_digital", title: "دنیای دیجیتال", category: "tech", city: "اصفهان", followers: 91000, story: 700000, post: 900000, reels: 0, approval: "approved" }),
    seedPage({ id: "p5", handle: "@zibaee_pro", title: "زیبایی پرو", category: "beauty", city: "مشهد", followers: 128000, story: 1000000, post: 1200000, reels: 0, approval: "approved" }),
    seedPage({ id: "p6", handle: "@food_gardi_ir", title: "فودگردی", category: "food", city: "تبریز", followers: 77000, story: 0, post: 0, reels: 700000, approval: "approved", bio: "معرفی رستوران‌ها و کافه‌ها" }),
    seedPage({ id: "p7", handle: "@safar_ba_ma", title: "سفر با ما", category: "travel", city: "رشت", followers: 56000, story: 0, post: 650000, reels: 750000, approval: "pending" }),
    seedPage({ id: "p8", handle: "@my_sample_style", title: "استایل نمونهٔ من", category: "fashion", city: "تهران", followers: 38000, story: 450000, post: 520000, reels: 0, approval: "approved", mine: true, bio: "پیج نمونهٔ ثبت‌شده توسط صاحب پیج" }),
    seedPage({ id: "p9", handle: "@my_sample_cafe", title: "کافهٔ نمونهٔ من", category: "food", city: "اصفهان", followers: 21000, story: 300000, post: 0, reels: 0, approval: "pending", mine: true }),
  ],
  campaigns: [
    { id: "c1", orderNumber: "PK-100231", title: "کلکسیون پاییزه کت و پالتو", business: "مزون آرمان", description: "کلکسیون جدید کت و پالتوی زنانه با ارسال رایگان به سراسر کشور.", link: "https://example.com/armaan", mediaName: "autumn.jpg", mediaKind: "image", budget: 6000000, count: 6, publishType: "story", category: "fashion", region: "تهران", notes: "", status: "running", createdAt: "2026-10-22T09:30:00Z", mine: false, selectedPageId: null,
      assignments: [seedAssignment("p1", "published", "https://example.com/proof/1", 1_000_000), seedAssignment("p2", "awaiting", "", 1_000_000)] },
    { id: "c2", orderNumber: "PK-100232", title: "منوی جدید صبحانه", business: "کافه نیلوفر", description: "معرفی منوی صبحانهٔ تازه با تخفیف هفتهٔ اول.", link: "@cafe_niloofar", mediaName: "breakfast.mp4", mediaKind: "video", budget: 4500000, count: 3, publishType: "reels", category: "food", region: "", notes: "ترجیحاً ساعات صبح منتشر شود.", status: "pending", createdAt: "2026-10-26T14:10:00Z", mine: false, selectedPageId: null, assignments: [] },
    { id: "c3", orderNumber: "PK-100233", title: "فروش ویژه هدفون بی‌سیم", business: "دیجی‌گجت", description: "هدفون بی‌سیم با ۱۸ ماه گارانتی و ارسال سریع.", link: "https://example.com/digigadget", mediaName: "headphone.png", mediaKind: "image", budget: 8000000, count: 5, publishType: "post", category: "tech", region: "", notes: "", status: "running", createdAt: "2026-10-20T11:00:00Z", mine: false, selectedPageId: null,
      assignments: [seedAssignment("p3", "published", "https://example.com/proof/3", 1_600_000), seedAssignment("p4", "awaiting", "", 1_600_000)] },
    { id: "c4", orderNumber: "PK-100234", title: "پکیج مراقبت پوست", business: "کلینیک درما", description: "پکیج سه‌جلسه‌ای مراقبت پوست با مشاورهٔ رایگان.", link: "https://example.com/derma", mediaName: "skin.jpg", mediaKind: "image", budget: 3200000, count: 4, publishType: "story", category: "beauty", region: "مشهد", notes: "", status: "completed", createdAt: "2026-10-12T08:45:00Z", mine: false, selectedPageId: null,
      assignments: [seedAssignment("p5", "published", "https://example.com/proof/5", 800_000)] },
    { id: "c5", orderNumber: "PK-100235", title: "تور دو روزه شمال", business: "آژانس مسیر سبز", description: "تور دو روزه با اقامت در ویلا و صبحانهٔ محلی.", link: "https://example.com/sabz", mediaName: "north.jpg", mediaKind: "image", budget: 5500000, count: 2, publishType: "post", category: "travel", region: "گیلان", notes: "", status: "rejected", createdAt: "2026-10-15T16:20:00Z", mine: false, selectedPageId: null, assignments: [] },
  ],
  offers: [
    { id: "o1", campaignId: null, pageId: "p8", campaignTitle: "کلکسیون پاییزه کت و پالتو", business: "مزون آرمان", topic: "پوشاک زنانه", amount: 900000, publishType: "story", deadline: "2026-11-05T00:00:00Z", status: "new" },
    { id: "o2", campaignId: null, pageId: "p9", campaignTitle: "منوی جدید صبحانه", business: "کافه نیلوفر", topic: "کافه و صبحانه", amount: 650000, publishType: "story", deadline: "2026-11-08T00:00:00Z", status: "new" },
    { id: "o3", campaignId: null, pageId: "p8", campaignTitle: "تخفیف پاییزه لوازم آرایشی", business: "فروشگاه رُز", topic: "زیبایی", amount: 700000, publishType: "post", deadline: "2026-11-02T00:00:00Z", status: "accepted" },
    { id: "o4", campaignId: null, pageId: "p8", campaignTitle: "فروش ویژه موبایل", business: "موبایل‌پلاس", topic: "فناوری", amount: 1200000, publishType: "story", deadline: "2026-10-31T00:00:00Z", status: "rejected" },
  ],
};
