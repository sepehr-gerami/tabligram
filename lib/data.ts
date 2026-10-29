import type { StoreState } from "@/types";

const ig = (h: string) => `https://instagram.com/${h}`;

/** Sample data only. Handles and follower counts are fictional. */
export const initialState: StoreState = {
  pages: [
    { id: "p1", handle: "@mode_dar_tehran", url: ig("mode_dar_tehran"), category: "fashion", city: "تهران", followers: 182000, price: 1200000, publishTypes: ["story", "post"], approval: "approved", owned: false },
    { id: "p2", handle: "@lebas_baz", url: ig("lebas_baz"), category: "fashion", city: "شیراز", followers: 64000, price: 600000, publishTypes: ["story", "reels"], approval: "approved", owned: false },
    { id: "p3", handle: "@tech_negar", url: ig("tech_negar"), category: "tech", city: "تهران", followers: 240000, price: 1800000, publishTypes: ["post", "reels"], approval: "approved", owned: false },
    { id: "p4", handle: "@donyaye_digital", url: ig("donyaye_digital"), category: "tech", city: "اصفهان", followers: 91000, price: 900000, publishTypes: ["post", "story"], approval: "approved", owned: false },
    { id: "p5", handle: "@zibaee_pro", url: ig("zibaee_pro"), category: "beauty", city: "مشهد", followers: 128000, price: 1000000, publishTypes: ["story", "post"], approval: "approved", owned: false },
    { id: "p6", handle: "@food_gardi_ir", url: ig("food_gardi_ir"), category: "food", city: "تبریز", followers: 77000, price: 700000, publishTypes: ["reels", "story"], approval: "approved", owned: false },
    { id: "p7", handle: "@safar_ba_ma", url: ig("safar_ba_ma"), category: "travel", city: "رشت", followers: 56000, price: 650000, publishTypes: ["post", "reels"], approval: "pending", owned: false },
    { id: "p8", handle: "@my_sample_style", url: ig("my_sample_style"), category: "fashion", city: "تهران", followers: 38000, price: 450000, publishTypes: ["story", "post"], approval: "approved", owned: true },
    { id: "p9", handle: "@my_sample_cafe", url: ig("my_sample_cafe"), category: "food", city: "اصفهان", followers: 21000, price: 300000, publishTypes: ["story"], approval: "pending", owned: true },
  ],
  campaigns: [
    { id: "c1", orderNumber: "PK-100231", title: "کلکسیون پاییزه کت و پالتو", business: "مزون آرمان", description: "کلکسیون جدید کت و پالتوی زنانه با ارسال رایگان به سراسر کشور.", link: "https://example.com/armaan", mediaName: "autumn.jpg", mediaKind: "image", budget: 6000000, count: 6, publishType: "story", category: "fashion", region: "تهران", notes: "", status: "running", createdAt: "2026-10-22T09:30:00Z", mine: false,
      assignments: [{ pageId: "p1", status: "published", proofUrl: "https://example.com/proof/1" }, { pageId: "p2", status: "awaiting", proofUrl: "" }] },
    { id: "c2", orderNumber: "PK-100232", title: "منوی جدید صبحانه", business: "کافه نیلوفر", description: "معرفی منوی صبحانهٔ تازه با تخفیف هفتهٔ اول.", link: "@cafe_niloofar", mediaName: "breakfast.mp4", mediaKind: "video", budget: 4500000, count: 3, publishType: "reels", category: "food", region: "", notes: "ترجیحاً ساعات صبح منتشر شود.", status: "pending", createdAt: "2026-10-26T14:10:00Z", mine: false, assignments: [] },
    { id: "c3", orderNumber: "PK-100233", title: "فروش ویژه هدفون بی‌سیم", business: "دیجی‌گجت", description: "هدفون بی‌سیم با ۱۸ ماه گارانتی و ارسال سریع.", link: "https://example.com/digigadget", mediaName: "headphone.png", mediaKind: "image", budget: 8000000, count: 5, publishType: "post", category: "tech", region: "", notes: "", status: "running", createdAt: "2026-10-20T11:00:00Z", mine: false,
      assignments: [{ pageId: "p3", status: "published", proofUrl: "https://example.com/proof/3" }, { pageId: "p4", status: "awaiting", proofUrl: "" }] },
    { id: "c4", orderNumber: "PK-100234", title: "پکیج مراقبت پوست", business: "کلینیک درما", description: "پکیج سه‌جلسه‌ای مراقبت پوست با مشاورهٔ رایگان.", link: "https://example.com/derma", mediaName: "skin.jpg", mediaKind: "image", budget: 3200000, count: 4, publishType: "story", category: "beauty", region: "مشهد", notes: "", status: "completed", createdAt: "2026-10-12T08:45:00Z", mine: false,
      assignments: [{ pageId: "p5", status: "published", proofUrl: "https://example.com/proof/5" }] },
    { id: "c5", orderNumber: "PK-100235", title: "تور دو روزه شمال", business: "آژانس مسیر سبز", description: "تور دو روزه با اقامت در ویلا و صبحانهٔ محلی.", link: "https://example.com/sabz", mediaName: "north.jpg", mediaKind: "image", budget: 5500000, count: 2, publishType: "post", category: "travel", region: "گیلان", notes: "", status: "rejected", createdAt: "2026-10-15T16:20:00Z", mine: false, assignments: [] },
  ],
  offers: [
    { id: "o1", campaignId: null, pageId: "p8", campaignTitle: "کلکسیون پاییزه کت و پالتو", business: "مزون آرمان", topic: "پوشاک زنانه", amount: 900000, publishType: "story", deadline: "2026-11-05T00:00:00Z", status: "new" },
    { id: "o2", campaignId: null, pageId: "p9", campaignTitle: "منوی جدید صبحانه", business: "کافه نیلوفر", topic: "کافه و صبحانه", amount: 650000, publishType: "story", deadline: "2026-11-08T00:00:00Z", status: "new" },
    { id: "o3", campaignId: null, pageId: "p8", campaignTitle: "تخفیف پاییزه لوازم آرایشی", business: "فروشگاه رُز", topic: "زیبایی", amount: 700000, publishType: "post", deadline: "2026-11-02T00:00:00Z", status: "accepted" },
    { id: "o4", campaignId: null, pageId: "p8", campaignTitle: "فروش ویژه موبایل", business: "موبایل‌پلاس", topic: "فناوری", amount: 1200000, publishType: "story", deadline: "2026-10-31T00:00:00Z", status: "rejected" },
  ],
};
