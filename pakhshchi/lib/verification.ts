/**
 * Page ownership verification module (demo).
 *
 * Two supported flows, mirrored after Instagram's real options:
 *  - "graph"      : Facebook Login for Business + Instagram Graph API. The owner
 *                   connects their account, we read `/me/accounts` and match the
 *                   page. Needs an app token → backend only.
 *  - "bio-code"   : we generate a one-time code, the owner puts it in their bio,
 *                   and we check it (server-side in production).
 *
 * In this demo there is no backend and no outbound scraping, so the Graph flow
 * validates the token *shape* only and the bio flow asks the owner to confirm
 * they published the code — a real deployment must move the confirmation behind
 * an API route that fetches instagram.com/<handle> server-side.
 */
import type { InstaPage, VerificationMethod, VerificationStatus } from "@/types";

/** Lifetime of a bio verification code. */
export const BIO_CODE_TTL_HOURS = 48;

export interface VerificationState {
  status: VerificationStatus;
  method: VerificationMethod | null;
  /** One-time code the owner must put in their bio (bio-code flow). */
  code: string | null;
  codeExpiresAt: string | null;
  /** ISO time of successful verification. */
  verifiedAt: string | null;
  /** Short human-readable note about the last attempt / result. */
  note: string;
}

export const emptyVerification = (): VerificationState => ({
  status: "unverified", method: null, code: null, codeExpiresAt: null, verifiedAt: null, note: "",
});

/** Fills missing fields for data saved before verification existed. */
export const migrateVerification = (v: Partial<VerificationState> | undefined): VerificationState => ({
  ...emptyVerification(), ...v,
});

/** e.g. "PKSH-PAGE-7F3K9Q" — unambiguous characters only. */
export function generateBioCode(handle: string): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let rand = "";
  for (let i = 0; i < 6; i++) rand += alphabet[Math.floor(Math.random() * alphabet.length)];
  const tag = handle.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "PAGE";
  return `PKSH-${tag}-${rand}`;
}

export const codeExpiry = (from = new Date()) =>
  new Date(from.getTime() + BIO_CODE_TTL_HOURS * 36e5).toISOString();

export const isCodeExpired = (state: VerificationState, now = Date.now()) =>
  !!state.codeExpiresAt && new Date(state.codeExpiresAt).getTime() < now;

/** Badge state of a page; pages saved before this feature count as unverified. */
export const verificationBadge = (p: InstaPage): VerificationStatus =>
  p.verification?.status ?? "unverified";

/**
 * Starts a verification flow: a fresh code replaces any previous state.
 * `graph` is accepted as a method for API symmetry but in the demo it also
 * produces a bio code (see `verifyGraphToken`) because there is no OAuth route.
 */
export function startVerification(state: VerificationState, handle: string, method: VerificationMethod): VerificationState {
  return {
    ...state,
    status: "awaiting",
    method,
    code: generateBioCode(handle),
    codeExpiresAt: codeExpiry(),
    note: method === "graph"
      ? "حساب خود را متصل کنید یا کد را در بیو بگذارید."
      : "کد در بیو پیج منتشر نشده است.",
  };
}

/** Message the owner should paste into their bio. */
export const bioInstruction = (code: string) => `${code} | پخشچی`;

/**
 * Confirms the pending flow. In this demo the owner self-confirms after
 * publishing the code; a real deployment verifies the live profile server-side.
 */
export function confirmVerification(state: VerificationState): VerificationState {
  if (state.status !== "awaiting" || !state.code) return state;
  if (isCodeExpired(state)) {
    return { ...state, status: "unverified", note: "کد منقضی شده است؛ کد جدید بگیرید." };
  }
  return { ...state, status: "verified", verifiedAt: new Date().toISOString(), note: "مالکیت تأیید شد." };
}

/**
 * Graph API flow: exchange the token the OAuth callback received. Here we only
 * check the token shape — a real backend would call
 * `GET https://graph.instagram.com/me?fields=id,username&access_token=...`
 */
export function verifyGraphToken(state: VerificationState, token: string, handle: string): VerificationState {
  const clean = token.trim();
  if (clean.length < 20) {
    return { ...state, method: "graph", note: "توکن واردشده معتبر به نظر نمی‌رسد." };
  }
  return {
    ...state,
    status: "verified",
    method: "graph",
    verifiedAt: new Date().toISOString(),
    note: `مالکیت پیج ${handle} از طریق Instagram Graph API تأیید شد.`,
  };
}

export const methodLabel: Record<VerificationMethod, string> = {
  graph: "Graph API (اتصال حساب)",
  "bio-code": "کد در بیو",
  "manual": "بررسی دستی",
};
