import { describe, expect, it } from "vitest";
import { commissionPercent, DEFAULT_COMMISSION_BPS, splitCommission } from "@/lib/commission";

describe("splitCommission", () => {
  it("takes 10% and keeps the sum exact", () => {
    expect(splitCommission(1_000_000)).toEqual({ commission: 100_000, publisherAmount: 900_000 });
    expect(splitCommission(500_000)).toEqual({ commission: 50_000, publisherAmount: 450_000 });
  });

  it("rounds to the nearest toman and never loses money", () => {
    const cases = [1, 7, 999, 1_234_567, 500_001];
    for (const amount of cases) {
      const { commission, publisherAmount } = splitCommission(amount);
      expect(commission + publisherAmount).toBe(amount);
      expect(commission).toBeGreaterThanOrEqual(0);
      expect(publisherAmount).toBeGreaterThanOrEqual(0);
    }
  });

  it("supports custom rates including zero and full commission", () => {
    expect(splitCommission(100_000, 0)).toEqual({ commission: 0, publisherAmount: 100_000 });
    expect(splitCommission(100_000, 10_000)).toEqual({ commission: 100_000, publisherAmount: 0 });
    expect(splitCommission(100_000, 250)).toEqual({ commission: 2_500, publisherAmount: 97_500 });
  });

  it("rejects invalid amounts and rates", () => {
    expect(() => splitCommission(-1)).toThrow(RangeError);
    expect(() => splitCommission(1.5)).toThrow(RangeError);
    expect(() => splitCommission(100, -1)).toThrow(RangeError);
    expect(() => splitCommission(100, 10_001)).toThrow(RangeError);
  });

  it("exposes the default as 10 percent", () => {
    expect(DEFAULT_COMMISSION_BPS).toBe(1000);
    expect(commissionPercent()).toBe(10);
  });
});
