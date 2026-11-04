import { describe, expect, it } from "vitest";
import {
  BANNER_LIMITS, checkBannerWindow, isBannerLive, isSafeLink, parseBannerInput, parseBannerPatch, publicBanner,
} from "@/lib/banner-rules";
import {
  bannerImageUrl, detectImageType, imageTypeOfName, isStoredName, storedBannerName,
} from "@/lib/image-rules";

const NAME = "0123456789abcdef0123456789abcdef";
const goodUrl = bannerImageUrl(`${NAME}.png`);
const base = { title: "Autumn offer", link: "/campaigns/new" };

type Errs = { errors: Record<string, string> };

describe("detectImageType (real content, not the extension)", () => {
  it("recognizes PNG, JPEG and WebP", () => {
    expect(detectImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toBe("image/png");
    expect(detectImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe("image/jpeg");
    const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0]);
    expect(detectImageType(webp)).toBe("image/webp");
  });
  it("rejects everything else, including SVG, HTML, GIF and too-short input", () => {
    const enc = (s: string) => new TextEncoder().encode(s);
    expect(detectImageType(enc("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(detectImageType(enc("<html><script>alert(1)</script></html>"))).toBeNull();
    expect(detectImageType(enc("GIF89a"))).toBeNull();
    expect(detectImageType(new Uint8Array(0))).toBeNull();
    expect(detectImageType(Uint8Array.from([0x89, 0x50]))).toBeNull();
    // RIFF but not WEBP (for example a WAV file)
    expect(detectImageType(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45]))).toBeNull();
  });
});

describe("stored file names and urls", () => {
  it("accepts only random hex names with an allowed extension", () => {
    expect(isStoredName(`${NAME}.png`)).toBe(true);
    expect(isStoredName(`${NAME}.jpg`)).toBe(true);
    expect(isStoredName(`${NAME}.webp`)).toBe(true);
    for (const bad of ["../etc/passwd", `${NAME}.svg`, `${NAME}.png.exe`, `x${NAME}.png`, "a.png", `${NAME}/.png`, `${NAME.toUpperCase()}.png`, ""]) {
      expect(isStoredName(bad)).toBe(false);
    }
  });
  it("only our own banner urls are recognized", () => {
    expect(storedBannerName(goodUrl)).toBe(`${NAME}.png`);
    for (const bad of ["https://evil.example/a.png", `/api/files/avatars/${NAME}.png`, `/api/files/banners/../${NAME}.png`, `/api/files/banners/${NAME}.svg`, `//evil.example/api/files/banners/${NAME}.png`]) {
      expect(storedBannerName(bad)).toBeNull();
    }
  });
  it("derives the content type from the stored name", () => {
    expect(imageTypeOfName(`${NAME}.jpg`)).toBe("image/jpeg");
    expect(imageTypeOfName("../x.png")).toBeNull();
  });
});

describe("isSafeLink", () => {
  it("allows internal paths and http(s) urls", () => {
    for (const ok of ["/", "/campaigns/new", "/pages?cat=fashion", "https://example.com/x", "http://example.com"]) expect(isSafeLink(ok)).toBe(true);
  });
  it("blocks scripts, protocol-relative urls, backslash tricks, spaces and empties", () => {
    for (const bad of ["", "javascript:alert(1)", "data:text/html,x", "//evil.example", "/\\evil.example", "/a b", "example.com", "ftp://example.com/x", `/${"a".repeat(BANNER_LIMITS.maxLink)}`]) {
      expect(isSafeLink(bad)).toBe(false);
    }
  });
});

describe("parseBannerInput", () => {
  it("accepts a minimal banner and fills defaults", () => {
    const r = parseBannerInput(base);
    expect(r).toEqual({
      ok: true,
      data: {
        title: "Autumn offer", description: null, link: "/campaigns/new", desktopImage: null, mobileImage: null,
        placement: "HERO", sortOrder: 0, isActive: true, startsAt: null, endsAt: null,
      },
    });
  });
  it("accepts a full banner with uploaded images and a schedule", () => {
    const r = parseBannerInput({
      ...base, description: " text ", desktopImage: goodUrl, mobileImage: bannerImageUrl(`${NAME}.webp`),
      placement: "SIDEBAR", sortOrder: "5", isActive: false, startsAt: "2026-11-10T00:00:00.000Z", endsAt: "2026-11-20T00:00:00.000Z",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({ description: "text", placement: "SIDEBAR", sortOrder: 5, isActive: false });
      expect(r.data.startsAt).toEqual(new Date("2026-11-10T00:00:00.000Z"));
    }
  });
  it("rejects bad fields one by one", () => {
    expect((parseBannerInput({ ...base, title: "a" }) as Errs).errors.title).toBeTruthy();
    expect((parseBannerInput({ ...base, title: "x".repeat(81) }) as Errs).errors.title).toBeTruthy();
    expect((parseBannerInput({ ...base, link: "javascript:alert(1)" }) as Errs).errors.link).toBeTruthy();
    expect((parseBannerInput({ title: "Valid title" }) as Errs).errors.link).toBeTruthy();
    expect((parseBannerInput({ ...base, placement: "TOP" }) as Errs).errors.placement).toBeTruthy();
    expect((parseBannerInput({ ...base, sortOrder: -1 }) as Errs).errors.sortOrder).toBeTruthy();
    expect((parseBannerInput({ ...base, sortOrder: 10_000 }) as Errs).errors.sortOrder).toBeTruthy();
    expect((parseBannerInput({ ...base, isActive: "yes" }) as Errs).errors.isActive).toBeTruthy();
    expect((parseBannerInput({ ...base, startsAt: "not a date" }) as Errs).errors.startsAt).toBeTruthy();
    expect((parseBannerInput({ ...base, description: "x".repeat(201) }) as Errs).errors.description).toBeTruthy();
  });
  it("accepts only images uploaded through this site", () => {
    expect((parseBannerInput({ ...base, desktopImage: "https://evil.example/a.png" }) as Errs).errors.desktopImage).toBeTruthy();
    expect((parseBannerInput({ ...base, mobileImage: "/api/files/banners/../../etc/passwd" }) as Errs).errors.mobileImage).toBeTruthy();
    expect(parseBannerInput({ ...base, desktopImage: "" }).ok).toBe(true);
  });
  it("requires the end to be after the start", () => {
    const r = parseBannerInput({ ...base, startsAt: "2026-11-20T00:00:00.000Z", endsAt: "2026-11-10T00:00:00.000Z" }) as Errs;
    expect(r.errors.endsAt).toBeTruthy();
    expect(checkBannerWindow(new Date("2026-01-01"), new Date("2026-01-01"))).toBeTruthy();
    expect(checkBannerWindow(null, new Date("2026-01-01"))).toBeNull();
  });
});

describe("parseBannerPatch", () => {
  it("validates only the fields that were sent", () => {
    expect(parseBannerPatch({ isActive: false })).toEqual({ ok: true, data: { isActive: false } });
    expect(parseBannerPatch({ sortOrder: 3, title: "New title" })).toEqual({ ok: true, data: { sortOrder: 3, title: "New title" } });
    expect(parseBannerPatch({ desktopImage: null })).toEqual({ ok: true, data: { desktopImage: null } });
  });
  it("rejects an empty patch and invalid values", () => {
    expect(parseBannerPatch({}).ok).toBe(false);
    expect((parseBannerPatch({ link: "//evil.example" }) as Errs).errors.link).toBeTruthy();
    expect((parseBannerPatch({ title: "" }) as Errs).errors.title).toBeTruthy();
    expect((parseBannerPatch({ placement: "nope" }) as Errs).errors.placement).toBeTruthy();
    expect((parseBannerPatch({ isActive: null }) as Errs).errors.isActive).toBeTruthy();
  });
  it("does not fill defaults for fields that were not sent", () => {
    const r = parseBannerPatch({ title: "Only title" });
    expect(r.ok && Object.keys(r.data)).toEqual(["title"]);
  });
});

describe("isBannerLive", () => {
  const now = new Date("2026-11-15T12:00:00.000Z");
  const d = (s: string) => new Date(s);
  it("respects the active flag and the schedule", () => {
    expect(isBannerLive({ isActive: true, startsAt: null, endsAt: null }, now)).toBe(true);
    expect(isBannerLive({ isActive: false, startsAt: null, endsAt: null }, now)).toBe(false);
    expect(isBannerLive({ isActive: true, startsAt: d("2026-11-16T00:00:00Z"), endsAt: null }, now)).toBe(false);
    expect(isBannerLive({ isActive: true, startsAt: d("2026-11-10T00:00:00Z"), endsAt: d("2026-11-14T00:00:00Z") }, now)).toBe(false);
    expect(isBannerLive({ isActive: true, startsAt: d("2026-11-10T00:00:00Z"), endsAt: d("2026-11-20T00:00:00Z") }, now)).toBe(true);
    expect(isBannerLive({ isActive: true, startsAt: null, endsAt: now }, now)).toBe(false);
  });
});

describe("publicBanner", () => {
  it("exposes only the public fields", () => {
    const row = {
      id: "b1", title: "T", description: null, link: "/x", desktopImage: null, mobileImage: null, placement: "HERO", sortOrder: 1,
      isActive: true, startsAt: new Date(), endsAt: null, createdById: "admin-secret-id", createdAt: new Date(), updatedAt: new Date(),
    };
    const pub = publicBanner(row);
    expect(Object.keys(pub).sort()).toEqual(["description", "desktopImage", "id", "link", "mobileImage", "placement", "sortOrder", "title"]);
    expect(JSON.stringify(pub)).not.toContain("admin-secret-id");
  });
});