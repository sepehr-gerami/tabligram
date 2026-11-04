import { describe, expect, it } from "vitest";
import {
  POLICY, activeHoldsTotal, addHours, affordableTypes, availableBalance, checkHoldRequest, computePayoutDueAt,
  depositDecision, nextStep, parseDepositInput,
  type Actor, type OrderAction, type RequestCheckInput, type StepInput,
} from "@/lib/money-rules";
import type { PagePublishType } from "@/lib/page-rules";

// Name strings written with unicode escapes so this file stays pure ASCII.
const ALI_REZAEI = "\u0639\u0644\u06CC \u0631\u0636\u0627\u06CC\u06CC";
const ALI_REZAEI_ARABIC_YEH = "\u0639\u0644\u064A \u0631\u0636\u0627\u064A\u064A";
const SOMEONE_ELSE = "\u0645\u0631\u06CC\u0645 \u06A9\u0631\u06CC\u0645\u06CC";

const T0 = new Date("2026-11-02T10:00:00.000Z");
const at = (hours: number) => addHours(T0, hours);

/* ------------------------------ balance ------------------------------ */

describe("availableBalance", () => {
  it("follows the example: deposit 3M, hold 1M, owner declines", () => {
    expect(availableBalance([3_000_000], [])).toBe(3_000_000);
    expect(availableBalance([3_000_000], [{ amount: 1_000_000, status: "HELD" }])).toBe(2_000_000);
    expect(availableBalance([3_000_000], [{ amount: 1_000_000, status: "REFUNDED" }])).toBe(3_000_000);
  });
  it("counts every non-refunded hold as committed", () => {
    for (const status of ["HELD", "PAYOUT_DUE", "PAID_OUT", "DISPUTED"]) {
      expect(availableBalance([3_000_000], [{ amount: 1_000_000, status }])).toBe(2_000_000);
    }
  });
  it("sums several deposits and holds", () => {
    expect(availableBalance([1_000_000, 2_000_000], [
      { amount: 500_000, status: "HELD" }, { amount: 700_000, status: "PAID_OUT" }, { amount: 900_000, status: "REFUNDED" },
    ])).toBe(1_800_000);
  });
  it("throws on invalid amounts", () => {
    expect(() => availableBalance([-1], [])).toThrow(RangeError);
    expect(() => availableBalance([1.5], [])).toThrow(RangeError);
    expect(() => availableBalance([100], [{ amount: Number.NaN, status: "HELD" }])).toThrow(RangeError);
  });
  it("activeHoldsTotal ignores refunded holds", () => {
    expect(activeHoldsTotal([{ amount: 5, status: "HELD" }, { amount: 7, status: "REFUNDED" }, { amount: 1, status: "PAID_OUT" }])).toBe(6);
  });
});

/* --------------------------- request checks -------------------------- */

const base = (): RequestCheckInput => ({
  advertiserId: "adv1",
  page: { ownerId: "own1", status: "APPROVED", category: "fashion", priceStory: 300_000, pricePost: 1_000_000, priceReels: 0 },
  type: "post",
  campaign: {
    advertiserId: "adv1", budget: 3_000_000, category: "fashion",
    publishTypes: ["story", "post", "reels"] as PagePublishType[], status: "APPROVED",
  },
  campaignActiveHolds: 0,
  available: 3_000_000,
  ownerCompletedOrders: 5,
});

describe("checkHoldRequest", () => {
  it("accepts a valid request and returns the page tariff as the amount", () => {
    expect(checkHoldRequest(base())).toEqual({ ok: true, amount: 1_000_000 });
    expect(checkHoldRequest({ ...base(), type: "story" })).toEqual({ ok: true, amount: 300_000 });
  });
  it("rejects a campaign that is not the advertiser's or not open", () => {
    expect(checkHoldRequest({ ...base(), advertiserId: "someone" }).ok).toBe(false);
    const b = base();
    expect(checkHoldRequest({ ...b, campaign: { ...b.campaign, status: "CANCELLED" } }).ok).toBe(false);
    expect(checkHoldRequest({ ...b, campaign: { ...b.campaign, status: "DRAFT" } }).ok).toBe(false);
  });
  it("rejects pages that are not approved", () => {
    const b = base();
    for (const status of ["PENDING", "REJECTED", "DISABLED"]) {
      expect(checkHoldRequest({ ...b, page: { ...b.page, status } }).ok).toBe(false);
    }
  });
  it("rejects choosing your own page (no wash trading)", () => {
    const b = base();
    expect(checkHoldRequest({ ...b, page: { ...b.page, ownerId: "adv1" } }).ok).toBe(false);
  });
  it("rejects a type the campaign did not select or the page does not offer", () => {
    const b = base();
    expect(checkHoldRequest({ ...b, campaign: { ...b.campaign, publishTypes: ["story"] } }).ok).toBe(false);
    expect(checkHoldRequest({ ...b, type: "reels" }).ok).toBe(false);
  });
  it("matches category only when the campaign has one", () => {
    const b = base();
    expect(checkHoldRequest({ ...b, page: { ...b.page, category: "food" } }).ok).toBe(false);
    expect(checkHoldRequest({ ...b, campaign: { ...b.campaign, category: null }, page: { ...b.page, category: "food" } }).ok).toBe(true);
  });
  it("caps the amount for brand-new page owners", () => {
    const b = base();
    const pricey = { ...b.page, pricePost: POLICY.newOwner.maxAmount + 1 };
    expect(checkHoldRequest({ ...b, page: pricey, ownerCompletedOrders: 0 }).ok).toBe(false);
    expect(checkHoldRequest({ ...b, page: pricey, ownerCompletedOrders: POLICY.newOwner.orders }).ok).toBe(true);
  });
  it("never lets active holds exceed the campaign budget", () => {
    const b = base();
    expect(checkHoldRequest({ ...b, campaignActiveHolds: 2_500_000 }).ok).toBe(false);
    expect(checkHoldRequest({ ...b, campaignActiveHolds: 2_000_000 }).ok).toBe(true);
  });
  it("requires enough free balance", () => {
    expect(checkHoldRequest({ ...base(), available: 999_999 }).ok).toBe(false);
    expect(checkHoldRequest({ ...base(), available: 1_000_000 }).ok).toBe(true);
  });
});

describe("affordableTypes", () => {
  const page = { priceStory: 300_000, pricePost: 1_000_000, priceReels: 0 };
  const all: PagePublishType[] = ["story", "post", "reels"];
  it("keeps only offered types that fit the remaining budget", () => {
    expect(affordableTypes(page, all, 500_000, 9)).toEqual(["story"]);
    expect(affordableTypes(page, all, 1_000_000, 9)).toEqual(["story", "post"]);
    expect(affordableTypes(page, all, 100_000, 9)).toEqual([]);
  });
  it("applies the new-owner cap", () => {
    const pricey = { ...page, pricePost: 2_000_000 };
    expect(affordableTypes(pricey, all, 5_000_000, 0)).toEqual(["story"]);
    expect(affordableTypes(pricey, all, 5_000_000, POLICY.newOwner.orders)).toEqual(["story", "post"]);
  });
});

/* --------------------------- payout timing --------------------------- */

describe("computePayoutDueAt", () => {
  it("waits for the minimum live time after the proof", () => {
    const r = computePayoutDueAt({ confirmedAt: at(1), proofSubmittedAt: at(0), publishType: "post", newOwner: false });
    expect(r).toEqual(at(POLICY.minLiveHours.post));
    const s = computePayoutDueAt({ confirmedAt: at(1), proofSubmittedAt: at(0), publishType: "story", newOwner: false });
    expect(s).toEqual(at(POLICY.minLiveHours.story));
  });
  it("uses the confirmation time when it is later than the live period", () => {
    const r = computePayoutDueAt({ confirmedAt: at(500), proofSubmittedAt: at(0), publishType: "reels", newOwner: false });
    expect(r).toEqual(at(500));
  });
  it("adds extra delay for new owners", () => {
    const r = computePayoutDueAt({ confirmedAt: at(1), proofSubmittedAt: at(0), publishType: "post", newOwner: true });
    expect(r).toEqual(at(POLICY.minLiveHours.post + POLICY.newOwner.extraDelayHours));
  });
});

/* ----------------------------- order flow ---------------------------- */

const order = (o: Partial<StepInput["order"]> = {}): StepInput["order"] => ({
  status: "REQUESTED", publishType: "post", respondByAt: at(48), publishDeadlineAt: null, proofSubmittedAt: null, ...o,
});
const holdOf = (status = "HELD", payoutDueAt: Date | null = null) => ({ status, payoutDueAt });
const step = (over: Partial<StepInput> & Pick<StepInput, "action" | "actor">): ReturnType<typeof nextStep> =>
  nextStep({ now: at(1), order: order(), hold: holdOf(), ...over });

describe("order flow: the happy path", () => {
  it("goes request -> accept -> proof -> confirm -> pay", () => {
    const accepted = step({ action: "accept", actor: "OWNER", now: at(1) });
    expect(accepted).toMatchObject({ ok: true, orderStatus: "ACCEPTED", holdStatus: "HELD", reveal: true });
    if (!accepted.ok) return;
    expect(accepted.publishDeadlineAt).toEqual(at(1 + POLICY.publishDeadlineHours));

    const proved = nextStep({
      action: "submit_proof", actor: "OWNER", now: at(10),
      order: order({ status: "ACCEPTED", publishDeadlineAt: accepted.publishDeadlineAt ?? null }),
      hold: holdOf(), proof: { hasPostLink: true, hasStatsScreenshot: true },
    });
    expect(proved).toMatchObject({ ok: true, orderStatus: "PUBLISHED", holdStatus: "HELD" });
    if (!proved.ok) return;

    const confirmed = nextStep({
      action: "confirm", actor: "ADVERTISER", now: at(12),
      order: order({ status: "PUBLISHED", proofSubmittedAt: proved.proofSubmittedAt ?? null }),
      hold: holdOf(), ownerCompletedOrders: 5,
    });
    expect(confirmed).toMatchObject({ ok: true, orderStatus: "CONFIRMED", holdStatus: "PAYOUT_DUE" });
    if (!confirmed.ok) return;
    expect(confirmed.payoutDueAt).toEqual(at(10 + POLICY.minLiveHours.post));

    const payoutOk = { verified: true, cardHolderName: ALI_REZAEI_ARABIC_YEH, verifiedName: ALI_REZAEI };
    const tooEarly = nextStep({
      action: "pay", actor: "ADMIN", now: at(20),
      order: order({ status: "CONFIRMED", proofSubmittedAt: at(10) }),
      hold: holdOf("PAYOUT_DUE", confirmed.payoutDueAt ?? null), payout: payoutOk,
    });
    expect(tooEarly.ok).toBe(false);

    const paid = nextStep({
      action: "pay", actor: "ADMIN", now: at(90),
      order: order({ status: "CONFIRMED", proofSubmittedAt: at(10) }),
      hold: holdOf("PAYOUT_DUE", confirmed.payoutDueAt ?? null), payout: payoutOk,
    });
    expect(paid).toEqual({ ok: true, orderStatus: "PAID_FULL", holdStatus: "PAID_OUT" });
  });
});

describe("order flow: requests", () => {
  it("lets the owner decline and refunds the hold", () => {
    expect(step({ action: "decline", actor: "OWNER" })).toMatchObject({ ok: true, orderStatus: "DECLINED", holdStatus: "REFUNDED" });
  });
  it("lets the advertiser cancel only before acceptance", () => {
    expect(step({ action: "cancel", actor: "ADVERTISER" })).toMatchObject({ ok: true, orderStatus: "CANCELLED", holdStatus: "REFUNDED" });
    expect(step({ action: "cancel", actor: "ADVERTISER", order: order({ status: "ACCEPTED" }) }).ok).toBe(false);
  });
  it("refuses to accept after the response deadline", () => {
    expect(step({ action: "accept", actor: "OWNER", now: at(49) }).ok).toBe(false);
  });
  it("expires an unanswered request and a missed publish deadline, refunding the advertiser", () => {
    expect(step({ action: "expire", actor: "SYSTEM", now: at(49) })).toMatchObject({
      ok: true, orderStatus: "CANCELLED", holdStatus: "REFUNDED", closedReason: "REQUEST_EXPIRED",
    });
    expect(step({ action: "expire", actor: "SYSTEM", now: at(60), order: order({ status: "ACCEPTED", publishDeadlineAt: at(50) }) })).toMatchObject({
      ok: true, orderStatus: "CANCELLED", holdStatus: "REFUNDED", closedReason: "PUBLISH_EXPIRED",
    });
    expect(step({ action: "expire", actor: "SYSTEM", now: at(10) }).ok).toBe(false);
  });
});

describe("order flow: proof and confirmation", () => {
  const accepted = (deadline = at(50)) => order({ status: "ACCEPTED", publishDeadlineAt: deadline });
  it("requires both the post link and the stats screenshot", () => {
    expect(step({ action: "submit_proof", actor: "OWNER", order: accepted() }).ok).toBe(false);
    expect(step({ action: "submit_proof", actor: "OWNER", order: accepted(), proof: { hasPostLink: true, hasStatsScreenshot: false } }).ok).toBe(false);
    expect(step({ action: "submit_proof", actor: "OWNER", order: accepted(), proof: { hasPostLink: false, hasStatsScreenshot: true } }).ok).toBe(false);
  });
  it("rejects proof after the publish deadline", () => {
    expect(step({ action: "submit_proof", actor: "OWNER", now: at(60), order: accepted(at(50)), proof: { hasPostLink: true, hasStatsScreenshot: true } }).ok).toBe(false);
  });
  it("lets the admin confirm only after the advertiser had time to respond", () => {
    const published = order({ status: "PUBLISHED", proofSubmittedAt: at(0) });
    expect(step({ action: "confirm", actor: "ADMIN", now: at(POLICY.advertiserConfirmHours - 1), order: published }).ok).toBe(false);
    const late = step({ action: "confirm", actor: "ADMIN", now: at(POLICY.advertiserConfirmHours), order: published, ownerCompletedOrders: 9 });
    expect(late).toMatchObject({ ok: true, orderStatus: "CONFIRMED", holdStatus: "PAYOUT_DUE" });
  });
  it("treats an unknown owner history as a new owner (longer delay)", () => {
    const published = order({ status: "PUBLISHED", proofSubmittedAt: at(0) });
    const r = step({ action: "confirm", actor: "ADVERTISER", now: at(1), order: published });
    expect(r.ok && r.payoutDueAt).toEqual(at(POLICY.minLiveHours.post + POLICY.newOwner.extraDelayHours));
  });
});

describe("order flow: disputes and payment guards", () => {
  it("freezes the hold when either side disputes", () => {
    for (const status of ["ACCEPTED", "PUBLISHED", "CONFIRMED"]) {
      const h = status === "CONFIRMED" ? "PAYOUT_DUE" : "HELD";
      for (const actor of ["OWNER", "ADVERTISER"] as Actor[]) {
        expect(step({ action: "dispute", actor, order: order({ status }), hold: holdOf(h) })).toMatchObject({
          ok: true, orderStatus: "DISPUTED", holdStatus: "DISPUTED",
        });
      }
    }
    expect(step({ action: "dispute", actor: "OWNER" }).ok).toBe(false); // still only REQUESTED
    expect(step({ action: "dispute", actor: "OWNER", order: order({ status: "PAID_FULL" }), hold: holdOf("PAID_OUT") }).ok).toBe(false);
  });
  it("lets only the admin resolve a dispute", () => {
    const disputed = order({ status: "DISPUTED", proofSubmittedAt: at(5) });
    expect(step({ action: "resolve_refund", actor: "ADMIN", order: disputed, hold: holdOf("DISPUTED") })).toMatchObject({
      ok: true, orderStatus: "CANCELLED", holdStatus: "REFUNDED", closedReason: "DISPUTE_REFUND",
    });
    expect(step({ action: "resolve_pay", actor: "ADMIN", order: disputed, hold: holdOf("DISPUTED") })).toMatchObject({
      ok: true, orderStatus: "CONFIRMED", holdStatus: "PAYOUT_DUE",
    });
    expect(step({ action: "resolve_pay", actor: "ADMIN", order: order({ status: "DISPUTED" }), hold: holdOf("DISPUTED") }).ok).toBe(false);
    expect(step({ action: "resolve_refund", actor: "OWNER", order: disputed, hold: holdOf("DISPUTED") }).ok).toBe(false);
  });
  it("blocks payment without verified identity or with a mismatching card holder name", () => {
    const confirmed = order({ status: "CONFIRMED", proofSubmittedAt: at(0) });
    const h = holdOf("PAYOUT_DUE", at(10));
    const pay = (payout?: StepInput["payout"]) => step({ action: "pay", actor: "ADMIN", now: at(20), order: confirmed, hold: h, payout });
    expect(pay().ok).toBe(false);
    expect(pay({ verified: false, cardHolderName: ALI_REZAEI, verifiedName: ALI_REZAEI }).ok).toBe(false);
    expect(pay({ verified: true, cardHolderName: SOMEONE_ELSE, verifiedName: ALI_REZAEI }).ok).toBe(false);
    expect(pay({ verified: true, cardHolderName: ALI_REZAEI, verifiedName: ALI_REZAEI }).ok).toBe(true);
  });
  it("cannot pay a disputed or already paid order", () => {
    const payout = { verified: true, cardHolderName: ALI_REZAEI, verifiedName: ALI_REZAEI };
    expect(step({ action: "pay", actor: "ADMIN", now: at(20), order: order({ status: "DISPUTED" }), hold: holdOf("DISPUTED", at(1)), payout }).ok).toBe(false);
    expect(step({ action: "pay", actor: "ADMIN", now: at(20), order: order({ status: "PAID_FULL" }), hold: holdOf("PAID_OUT", at(1)), payout }).ok).toBe(false);
  });
  it("fails when the order has no hold", () => {
    expect(step({ action: "accept", actor: "OWNER", hold: null }).ok).toBe(false);
  });
});

/* -------------------- money-safety properties (exhaustive) ------------------- */

const ACTIONS: OrderAction[] = ["accept", "decline", "cancel", "expire", "submit_proof", "confirm", "dispute", "resolve_refund", "resolve_pay", "pay"];
const ACTORS: Actor[] = ["OWNER", "ADVERTISER", "ADMIN", "SYSTEM"];
const ORDER_STATUSES = ["REQUESTED", "ACCEPTED", "DECLINED", "PUBLISHED", "CONFIRMED", "PAID_FULL", "DISPUTED", "CANCELLED"];
const HOLD_STATUSES = ["HELD", "PAYOUT_DUE", "PAID_OUT", "REFUNDED", "DISPUTED"];

function everyInput(): StepInput[] {
  const out: StepInput[] = [];
  const payout = { verified: true, cardHolderName: ALI_REZAEI, verifiedName: ALI_REZAEI };
  for (const action of ACTIONS) for (const actor of ACTORS) for (const status of ORDER_STATUSES) for (const hs of HOLD_STATUSES) {
    out.push({
      action, actor, now: at(1000),
      order: { status, publishType: "post", respondByAt: at(1), publishDeadlineAt: at(1), proofSubmittedAt: at(0) },
      hold: { status: hs, payoutDueAt: at(2) },
      proof: { hasPostLink: true, hasStatsScreenshot: true },
      ownerCompletedOrders: 10, payout,
    });
  }
  return out;
}

describe("money safety properties", () => {
  const inputs = everyInput();

  it("only the admin can ever move a hold to PAID_OUT", () => {
    for (const i of inputs) {
      const r = nextStep(i);
      if (r.ok && r.holdStatus === "PAID_OUT") expect(i.actor).toBe("ADMIN");
    }
  });
  it("the page owner can never make money payable or paid", () => {
    for (const i of inputs.filter((x) => x.actor === "OWNER")) {
      const r = nextStep(i);
      if (r.ok) expect(["PAYOUT_DUE", "PAID_OUT"]).not.toContain(r.holdStatus);
    }
  });
  it("PAID_OUT and REFUNDED are terminal: nothing can change them", () => {
    for (const i of inputs.filter((x) => x.hold && ["PAID_OUT", "REFUNDED"].includes(x.hold.status))) {
      expect(nextStep(i).ok).toBe(false);
    }
  });
  it("a refund never happens from a paid or payable hold", () => {
    for (const i of inputs) {
      const r = nextStep(i);
      if (r.ok && r.holdStatus === "REFUNDED") expect(["HELD", "DISPUTED"]).toContain(i.hold?.status);
    }
  });
  it("the system user can only expire requests", () => {
    for (const i of inputs.filter((x) => x.actor === "SYSTEM")) {
      const r = nextStep(i);
      if (r.ok) expect(i.action).toBe("expire");
    }
  });
});

/* ------------------------------- deposits ------------------------------- */

describe("parseDepositInput", () => {
  it("accepts a valid deposit and normalizes it", () => {
    const r = parseDepositInput({ amount: "1,500,000", reference: " trx 12 345 ", note: "  hi  " });
    expect(r).toEqual({ ok: true, data: { amount: 1_500_000, reference: "trx12345", note: "hi" } });
  });
  it("accepts Persian digits", () => {
    const r = parseDepositInput({ amount: "\u06F1\u06F5\u06F0\u06F0\u06F0\u06F0\u06F0", reference: "\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6" });
    expect(r.ok && r.data.amount).toBe(1_500_000);
    expect(r.ok && r.data.reference).toBe("123456");
  });
  it("rejects bad amounts, references and notes", () => {
    const bad = parseDepositInput({ amount: 50, reference: "ab", note: "x".repeat(301) });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(["amount", "note", "reference"]);
    expect(parseDepositInput({ amount: "abc", reference: "123456" }).ok).toBe(false);
    expect(parseDepositInput({ amount: 2_000_000_000, reference: "123456" }).ok).toBe(false);
  });
});

describe("depositDecision", () => {
  it("lets the admin verify or reject only a pending deposit", () => {
    expect(depositDecision("PENDING", "verify")).toEqual({ ok: true, status: "VERIFIED" });
    expect(depositDecision("PENDING", "reject", "receipt does not match the bank record")).toEqual({
      ok: true, status: "REJECTED", reason: "receipt does not match the bank record",
    });
    expect(depositDecision("PENDING", "reject").ok).toBe(false);
    expect(depositDecision("VERIFIED", "verify").ok).toBe(false);
    expect(depositDecision("REJECTED", "verify").ok).toBe(false);
  });
});