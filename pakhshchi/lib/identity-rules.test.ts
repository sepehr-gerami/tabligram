import { describe, expect, it } from "vitest";
import {
  cardLast4, cleanPersonName, isValidCardNumber, isValidNationalId, maskCard, namesMatch,
  normalizeCardNumber, normalizeNationalId, parsePayoutInput, passesLuhn,
} from "@/lib/identity-rules";

// Name strings written with unicode escapes so this file stays pure ASCII.
const ALI = "\u0639\u0644\u06CC"; // Persian "Ali" with Persian yeh
const ALI_ARABIC_YEH = "\u0639\u0644\u064A"; // same word typed with Arabic yeh
const ALIREZA_ZWNJ = "\u0639\u0644\u06CC\u200c\u0631\u0636\u0627";
const ALIREZA_SPACE = "\u0639\u0644\u06CC \u0631\u0636\u0627";
const ALIREZA_JOINED = "\u0639\u0644\u06CC\u0631\u0636\u0627";
const REZAEI = "\u0631\u0636\u0627\u06CC\u06CC";

describe("national id", () => {
  it("accepts a valid checksum", () => {
    expect(isValidNationalId("1234567891")).toBe(true);
  });
  it("rejects a wrong check digit, wrong length and repeated digits", () => {
    expect(isValidNationalId("1234567890")).toBe(false);
    expect(isValidNationalId("123456789")).toBe(false);
    expect(isValidNationalId("12345678912")).toBe(false);
    expect(isValidNationalId("1111111111")).toBe(false);
    expect(isValidNationalId("abcdefghij")).toBe(false);
  });
  it("normalizes Persian digits and separators", () => {
    expect(normalizeNationalId("\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9\u06F1")).toBe("1234567891");
    expect(normalizeNationalId("123-456 7891")).toBe("1234567891");
  });
  it("also accepts the case where the remainder is 0 or 1", () => {
    // build ids whose weighted sum gives remainder 0 and 1
    const make = (prefix: string) => {
      let sum = 0;
      for (let i = 0; i < 9; i++) sum += Number(prefix[i]) * (10 - i);
      const r = sum % 11;
      return prefix + String(r < 2 ? r : 11 - r);
    };
    for (const p of ["123456789", "987654321", "100000001", "246810121"]) {
      expect(isValidNationalId(make(p))).toBe(true);
    }
  });
});

describe("card number", () => {
  it("accepts a Luhn-valid 16 digit number", () => {
    expect(isValidCardNumber("4111111111111111")).toBe(true);
    expect(passesLuhn("4111111111111111")).toBe(true);
  });
  it("rejects bad checksum, bad length and non-digits", () => {
    expect(isValidCardNumber("4111111111111112")).toBe(false);
    expect(isValidCardNumber("411111111111111")).toBe(false);
    expect(isValidCardNumber("41111111111111111")).toBe(false);
    expect(isValidCardNumber("41111111111111ab")).toBe(false);
  });
  it("normalizes spaces, hyphens and Persian digits", () => {
    expect(normalizeCardNumber("4111-1111 1111-1111")).toBe("4111111111111111");
    expect(normalizeCardNumber("\u06F4\u06F1\u06F1\u06F1\u06F1\u06F1\u06F1\u06F1\u06F1\u06F1\u06F1\u06F1\u06F1\u06F1\u06F1\u06F1")).toBe("4111111111111111");
  });
  it("masks and exposes only the last 4 digits", () => {
    expect(cardLast4("4111111111111111")).toBe("1111");
    expect(maskCard("4111111111111234")).toBe("****-****-****-1234");
    expect(maskCard("4111111111111234")).not.toContain("4111");
  });
});

describe("person names", () => {
  it("unifies Arabic letters and keeps the half-space", () => {
    expect(cleanPersonName(ALI_ARABIC_YEH)).toBe(ALI);
    expect(cleanPersonName(`  ${ALIREZA_ZWNJ}  `)).toBe(ALIREZA_ZWNJ);
  });
  it("matches names regardless of half-space, space and Arabic yeh", () => {
    expect(namesMatch(ALIREZA_ZWNJ, ALIREZA_SPACE)).toBe(true);
    expect(namesMatch(ALIREZA_ZWNJ, ALIREZA_JOINED)).toBe(true);
    expect(namesMatch(ALI_ARABIC_YEH, ALI)).toBe(true);
  });
  it("does not match different or empty names", () => {
    expect(namesMatch(ALI, REZAEI)).toBe(false);
    expect(namesMatch("", "")).toBe(false);
    expect(namesMatch("   ", "   ")).toBe(false);
  });
});

describe("parsePayoutInput", () => {
  const valid = { firstName: ALI, lastName: REZAEI, nationalId: "1234567891", cardNumber: "4111 1111 1111 1111" };

  it("accepts and normalizes valid input", () => {
    const r = parsePayoutInput(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.cardNumber).toBe("4111111111111111");
      expect(r.data.cardLast4).toBe("1111");
      expect(r.data.nationalId).toBe("1234567891");
      expect(r.data.firstName).toBe(ALI);
    }
  });

  it("reports an error per invalid field", () => {
    const r = parsePayoutInput({ firstName: "1", lastName: "", nationalId: "1234567890", cardNumber: "4111111111111112" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(["cardNumber", "firstName", "lastName", "nationalId"]);
    }
  });

  it("rejects names containing digits or symbols", () => {
    const withDigit = parsePayoutInput({ ...valid, firstName: `${ALI}2` });
    const withSymbol = parsePayoutInput({ ...valid, lastName: `${REZAEI}!` });
    expect(withDigit.ok).toBe(false);
    expect(withSymbol.ok).toBe(false);
  });

  it("rejects non-string input safely", () => {
    const r = parsePayoutInput({ firstName: 5, lastName: null, nationalId: undefined, cardNumber: {} });
    expect(r.ok).toBe(false);
  });
});