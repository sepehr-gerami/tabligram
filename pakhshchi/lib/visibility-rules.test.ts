import { describe, expect, it } from "vitest";
import {
  contactLeakErrors, findContactLeaks, isRevealed, shapeCampaignForPageOwner, shapePage, shapePayoutProfile,
  type FullCampaign, type FullPage, type Viewer,
} from "@/lib/visibility-rules";

const page: FullPage = {
  id: "pg1", ownerId: "own1", handle: "@secret_page", title: "SecretTitle", category: "fashion", city: "Tehran",
  bio: "private bio text", followers: 12000, avgStoryViews: 400, avgPostViews: 900, avgReelsViews: 0,
  priceStory: 300_000, pricePost: 1_000_000, priceReels: 0, avatarUrl: "/uploads/secret-avatar.png",
  status: "APPROVED", rejectReason: null,
};
const anon: Viewer = { userId: null, isAdmin: false };
const advertiser: Viewer = { userId: "adv1", isAdmin: false };
const owner: Viewer = { userId: "own1", isAdmin: false };
const admin: Viewer = { userId: "adm1", isAdmin: true };

describe("isRevealed", () => {
  it("is true only after acceptance", () => {
    expect(isRevealed({ revealedAt: null })).toBe(false);
    expect(isRevealed({ revealedAt: new Date() })).toBe(true);
  });
});

describe("shapePage", () => {
  it("shows only stats, category, city and tariffs to anyone before the reveal", () => {
    for (const viewer of [anon, advertiser]) {
      const v = shapePage(page, viewer, false);
      expect(v.level).toBe("public");
      const json = JSON.stringify(v);
      for (const secret of ["secret_page", "SecretTitle", "private bio", "secret-avatar", "own1", "instagram.com", "rejectReason", "status"]) {
        expect(json).not.toContain(secret);
      }
      expect(v).toMatchObject({ followers: 12000, category: "fashion", city: "Tehran", pricePost: 1_000_000 });
      expect(v).toHaveProperty("offeredTypes", ["story", "post"]);
    }
  });

  it("adds the identity (handle, link, name, bio, avatar) after the reveal, but never the owner id or status", () => {
    const v = shapePage(page, advertiser, true);
    expect(v.level).toBe("revealed");
    expect(v).toMatchObject({ handle: "@secret_page", instagramUrl: "https://instagram.com/secret_page", title: "SecretTitle" });
    const json = JSON.stringify(v);
    expect(json).not.toContain("own1");
    expect(json).not.toContain("status");
    expect(json).not.toContain("rejectReason");
  });

  it("gives the owner their own page with status and reject reason, even without a reveal", () => {
    const v = shapePage({ ...page, status: "REJECTED", rejectReason: "bad stats" }, owner, false);
    expect(v).toMatchObject({ level: "owner", handle: "@secret_page", status: "REJECTED", rejectReason: "bad stats" });
    expect(JSON.stringify(v)).not.toContain("ownerId");
  });

  it("gives the admin everything, and the admin wins over other roles", () => {
    expect(shapePage(page, admin, false)).toMatchObject({ level: "admin", ownerId: "own1", handle: "@secret_page" });
    expect(shapePage(page, { userId: "own1", isAdmin: true }, false).level).toBe("admin");
  });

  it("never leaks extra fields added to the record later", () => {
    const withExtra = { ...page, internalNote: "internal-only", payoutCard: "6037" } as FullPage;
    const json = JSON.stringify(shapePage(withExtra, advertiser, true));
    expect(json).not.toContain("internal-only");
    expect(json).not.toContain("6037");
  });
});

const campaign: FullCampaign = {
  id: "c1", advertiserId: "adv1", title: "Autumn collection", business: "AdvBusinessName", description: "New coats",
  link: "https://adv.example/shop", mediaUrl: "/uploads/ad.jpg", mediaKind: "image", budget: 6_000_000,
  category: "fashion", city: "Tehran", notes: "post in the morning", publishTypes: ["post", "story"],
};

describe("shapeCampaignForPageOwner", () => {
  it("hides business, link, budget and advertiser before the reveal", () => {
    const v = shapeCampaignForPageOwner(campaign, false);
    expect(v.revealed).toBe(false);
    const json = JSON.stringify(v);
    for (const secret of ["AdvBusinessName", "adv.example", "6000000", "adv1", "budget", "advertiserId"]) {
      expect(json).not.toContain(secret);
    }
    expect(v).toMatchObject({ title: "Autumn collection", description: "New coats", mediaUrl: "/uploads/ad.jpg", publishTypes: ["post", "story"] });
  });
  it("adds business and link after the reveal, still without the total budget or advertiser id", () => {
    const v = shapeCampaignForPageOwner(campaign, true);
    expect(v).toMatchObject({ revealed: true, business: "AdvBusinessName", link: "https://adv.example/shop" });
    const json = JSON.stringify(v);
    expect(json).not.toContain("6000000");
    expect(json).not.toContain("adv1");
  });
});

describe("findContactLeaks", () => {
  it("passes ordinary ad text", () => {
    expect(findContactLeaks("New autumn coats with free shipping, 20 percent off")).toEqual([]);
    expect(findContactLeaks("price 1500000 toman for 12 months")).toEqual([]);
    expect(findContactLeaks("")).toEqual([]);
    // Persian: "20 percent discount on the new collection"
    expect(findContactLeaks("\u062A\u062E\u0641\u06CC\u0641 \u06F2\u06F0 \u062F\u0631\u0635\u062F\u06CC \u0631\u0648\u06CC \u06A9\u0644\u06A9\u0633\u06CC\u0648\u0646 \u062C\u062F\u06CC\u062F")).toEqual([]);
  });
  it("detects handles, emails and links", () => {
    expect(findContactLeaks("contact @my_page now")).toContain("handle");
    expect(findContactLeaks("write to someone@mail.com")).toContain("email");
    expect(findContactLeaks("see https://example.com/x")).toContain("url");
    expect(findContactLeaks("visit www.site.ir")).toContain("url");
    expect(findContactLeaks("order at myshop.com")).toContain("url");
  });
  it("detects Iranian mobile numbers in several formats, including Persian digits", () => {
    expect(findContactLeaks("call 09123456789")).toContain("phone");
    expect(findContactLeaks("call 0912 345 6789")).toContain("phone");
    expect(findContactLeaks("call +98 912 345 6789")).toContain("phone");
    expect(findContactLeaks("call \u06F0\u06F9\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9")).toContain("phone");
  });
  it("detects messenger names", () => {
    expect(findContactLeaks("join t.me/abc")).toContain("messenger");
    expect(findContactLeaks("our whatsapp line")).toContain("messenger");
    expect(findContactLeaks("\u06A9\u0627\u0646\u0627\u0644 \u062A\u0644\u06AF\u0631\u0627\u0645 \u0645\u0627")).toContain("messenger");
  });
});

describe("contactLeakErrors", () => {
  it("returns an error only for the fields that contain a contact detail", () => {
    const e = contactLeakErrors({ title: "Autumn coats", description: "dm @my_page", notes: null, extra: undefined });
    expect(Object.keys(e)).toEqual(["description"]);
  });
});

describe("shapePayoutProfile", () => {
  const profile = { firstName: "Ali", lastName: "Rezaei", cardLast4: "1234", payoutStatus: "PENDING", payoutRejectReason: null };
  const secrets = { cardNumber: "4111111111111234", nationalId: "1234567891" };

  it("shows the owner only their name, masked card and status, even if secrets are passed", () => {
    const v = shapePayoutProfile(profile, "own1", owner, secrets);
    expect(v).toMatchObject({ firstName: "Ali", maskedCard: "****-****-****-1234", status: "PENDING" });
    const json = JSON.stringify(v);
    expect(json).not.toContain("4111111111111234");
    expect(json).not.toContain("1234567891");
  });
  it("shows the admin the secrets only when the caller supplies them", () => {
    expect(shapePayoutProfile(profile, "own1", admin, secrets)).toMatchObject(secrets);
    const without = shapePayoutProfile(profile, "own1", admin);
    expect(without).not.toHaveProperty("cardNumber");
    expect(without).not.toHaveProperty("nationalId");
  });
  it("shows nothing to anyone else", () => {
    expect(shapePayoutProfile(profile, "own1", advertiser, secrets)).toBeNull();
    expect(shapePayoutProfile(profile, "own1", anon, secrets)).toBeNull();
  });
  it("has no masked card when none is stored", () => {
    expect(shapePayoutProfile({ ...profile, cardLast4: null }, "own1", owner)?.maskedCard).toBeNull();
  });
});