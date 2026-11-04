import { describe, expect, it } from "vitest";
import {
  adminTransition, hasEffectiveChange, isStale, normalizeHandleValue, offeredTypes, parsePageInput,
  parseRejectReason, priceForType, statusAfterOwnerEdit, toPublicPage,
} from "@/lib/page-rules";

const base = { handle: "my_page", category: "fashion", followers: "12,000", publishTypes: ["post"], pricePost: "1,500,000" };

type Errs = { errors: Record<string, string> };

function data(over: Record<string, unknown> = {}) {
  const r = parsePageInput({ ...base, ...over });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.data;
}

describe("normalizeHandleValue", () => {
  it("adds @ and lowercases", () => {
    expect(normalizeHandleValue("  My_Page ")).toBe("@my_page");
    expect(normalizeHandleValue("@@Abc")).toBe("@abc");
  });
});

describe("parsePageInput", () => {
  it("accepts a minimal valid page and normalizes it", () => {
    const d = data();
    expect(d.handle).toBe("@my_page");
    expect(d.title).toBe("@my_page");
    expect(d.followers).toBe(12000);
    expect(d.pricePost).toBe(1500000);
    expect(d.priceReels).toBe(0);
    expect(d.priceStory).toBe(0);
  });

  it("accepts Persian digits", () => {
    expect(data({ followers: "\u06F1\u06F2\u06F0\u06F0\u06F0" }).followers).toBe(12000);
  });

  it("ignores the price of an unselected publish type", () => {
    const d = data({ priceReels: 999999, priceStory: 999999 });
    expect(d.priceReels).toBe(0);
    expect(d.priceStory).toBe(0);
  });

  it("supports all three publish types, each with its own price and views", () => {
    const d = data({
      publishTypes: ["story", "post", "reels"],
      priceStory: "300,000", pricePost: "1,500,000", priceReels: "800,000",
      avgStoryViews: "4,000", avgPostViews: "3,000", avgReelsViews: "9,000",
    });
    expect(d.priceStory).toBe(300000);
    expect(d.pricePost).toBe(1500000);
    expect(d.priceReels).toBe(800000);
    expect(d.avgStoryViews).toBe(4000);
    expect(d.avgReelsViews).toBe(9000);
    expect(offeredTypes(d)).toEqual(["story", "post", "reels"]);
  });

  it("accepts a story-only page", () => {
    const d = data({ publishTypes: ["story"], priceStory: 250000, pricePost: undefined });
    expect(offeredTypes(d)).toEqual(["story"]);
    expect(d.pricePost).toBe(0);
  });

  it("rejects invalid input per field", () => {
    expect((parsePageInput({ ...base, handle: "a" }) as Errs).errors.handle).toBeTruthy();
    expect((parsePageInput({ ...base, handle: "bad..name" }) as Errs).errors.handle).toBeTruthy();
    expect((parsePageInput({ ...base, category: "nope" }) as Errs).errors.category).toBeTruthy();
    expect((parsePageInput({ ...base, category: undefined }) as Errs).errors.category).toBeTruthy();
    expect((parsePageInput({ ...base, followers: 50 }) as Errs).errors.followers).toBeTruthy();
    expect((parsePageInput({ ...base, publishTypes: [] }) as Errs).errors.publishTypes).toBeTruthy();
    expect((parsePageInput({ ...base, publishTypes: ["live"] }) as Errs).errors.publishTypes).toBeTruthy();
    expect((parsePageInput({ ...base, pricePost: 1000 }) as Errs).errors.pricePost).toBeTruthy();
  });

  it("requires a valid price for every selected type", () => {
    expect((parsePageInput({ ...base, publishTypes: ["story", "post"], priceStory: undefined }) as Errs).errors.priceStory).toBeTruthy();
    expect((parsePageInput({ ...base, publishTypes: ["story", "post"], priceStory: 100 }) as Errs).errors.priceStory).toBeTruthy();
  });
});

describe("priceForType", () => {
  it("returns the tariff of each type", () => {
    const p = { priceStory: 1, pricePost: 2, priceReels: 3 };
    expect(priceForType(p, "story")).toBe(1);
    expect(priceForType(p, "post")).toBe(2);
    expect(priceForType(p, "reels")).toBe(3);
  });
});

describe("hasEffectiveChange", () => {
  it("is false when nothing changed", () => {
    expect(hasEffectiveChange(data(), data())).toBe(false);
  });
  it("is true when a field or the avatar changed", () => {
    expect(hasEffectiveChange(data(), data({ followers: 13000 }))).toBe(true);
    expect(hasEffectiveChange(data(), data({ publishTypes: ["post", "reels"], priceReels: 800000 }))).toBe(true);
    expect(hasEffectiveChange(data(), data({ publishTypes: ["post", "story"], priceStory: 300000 }))).toBe(true);
    expect(hasEffectiveChange(data(), data({ avgStoryViews: 500 }))).toBe(true);
    expect(hasEffectiveChange(data(), data(), { avatarChanged: true })).toBe(true);
  });
});

describe("statusAfterOwnerEdit", () => {
  it("sends changed approved/rejected pages back to PENDING", () => {
    expect(statusAfterOwnerEdit("APPROVED", true)).toEqual({ ok: true, status: "PENDING", resubmitted: true });
    expect(statusAfterOwnerEdit("REJECTED", true)).toEqual({ ok: true, status: "PENDING", resubmitted: true });
  });
  it("keeps the status when nothing changed", () => {
    expect(statusAfterOwnerEdit("APPROVED", false)).toEqual({ ok: true, status: "APPROVED", resubmitted: false });
    expect(statusAfterOwnerEdit("REJECTED", false)).toEqual({ ok: true, status: "REJECTED", resubmitted: false });
  });
  it("blocks owner edits on a disabled page", () => {
    expect(statusAfterOwnerEdit("DISABLED", true).ok).toBe(false);
  });
});

describe("adminTransition", () => {
  it("allows only valid transitions", () => {
    expect(adminTransition("PENDING", "approve")).toBe("APPROVED");
    expect(adminTransition("REJECTED", "approve")).toBe("APPROVED");
    expect(adminTransition("APPROVED", "approve")).toBeNull();
    expect(adminTransition("PENDING", "reject")).toBe("REJECTED");
    expect(adminTransition("REJECTED", "reject")).toBeNull();
    expect(adminTransition("APPROVED", "disable")).toBe("DISABLED");
    expect(adminTransition("PENDING", "disable")).toBeNull();
    expect(adminTransition("DISABLED", "restore")).toBe("APPROVED");
    expect(adminTransition("DISABLED", "approve")).toBeNull();
  });
});

describe("parseRejectReason", () => {
  it("requires a real reason", () => {
    expect(parseRejectReason("ab").ok).toBe(false);
    expect(parseRejectReason("     ").ok).toBe(false);
    expect(parseRejectReason(undefined).ok).toBe(false);
    expect(parseRejectReason("x".repeat(301)).ok).toBe(false);
  });
  it("trims and collapses whitespace", () => {
    expect(parseRejectReason("  bad    stats  here ")).toEqual({ ok: true, reason: "bad stats here" });
  });
});

describe("isStale", () => {
  const now = new Date("2026-11-01T10:00:00.000Z");
  it("detects stale or malformed timestamps", () => {
    expect(isStale("2026-11-01T10:00:00.000Z", now)).toBe(false);
    expect(isStale("2026-11-01T09:59:59.000Z", now)).toBe(true);
    expect(isStale("garbage", now)).toBe(true);
    expect(isStale(undefined, now)).toBe(true);
  });
});

describe("toPublicPage", () => {
  it("never leaks identity fields, even if extra props are passed at runtime", () => {
    const leaky = {
      id: "x1", category: "fashion", city: "Tehran", followers: 1000,
      avgStoryViews: 20, avgPostViews: 10, avgReelsViews: 0,
      priceStory: 0, pricePost: 60000, priceReels: 0,
      handle: "@secret_handle", ownerId: "u1", avatarUrl: "/a.png", bio: "private", title: "Secret",
    };
    const pub = toPublicPage(leaky as never);
    expect(Object.keys(pub).sort()).toEqual(
      ["avgPostViews", "avgReelsViews", "avgStoryViews", "category", "city", "followers", "id",
        "offeredTypes", "pricePost", "priceReels", "priceStory"].sort(),
    );
    expect(JSON.stringify(pub)).not.toContain("secret");
    expect(pub.offeredTypes).toEqual(["post"]);
  });
});