// قوانین خالص پول و گردش درخواست: موجودی، بلوکه، گذار وضعیت‌ها و زمان‌بندی پرداخت.
// هیچ import سمت‌سروری ندارد. API سرور باید همیشه این قوانین را اجرا کند و نتیجه را داخل یک transaction ثبت کند.
// همهٔ مبلغ‌ها عدد صحیح تومان هستند. عددهای قابل‌تنظیم در POLICY جمع شده‌اند.
import { namesMatch } from "@/lib/identity-rules";
import { priceForType, parseRejectReason, type PagePublishType } from "@/lib/page-rules";
import { toLatinDigits } from "@/lib/utils";

export type HoldStatusValue = "HELD" | "PAYOUT_DUE" | "PAID_OUT" | "REFUNDED" | "DISPUTED";
export type OrderStatusValue =
  | "REQUESTED" | "ACCEPTED" | "DECLINED" | "PUBLISHED" | "CONFIRMED" | "PAID_FULL" | "DISPUTED" | "CANCELLED";

/** عددهای سیاست‌گذاری؛ برای تغییر، فقط همین‌جا را عوض کن. */
export const POLICY = {
  /** مهلت پاسخ صاحب پیج به درخواست */
  respondHours: 48,
  /** مهلت انتشار بعد از پذیرش */
  publishDeadlineHours: 48,
  /** مهلت تأیید تبلیغ‌دهنده بعد از ثبت مدرک؛ بعد از آن مدیر می‌تواند تصمیم بگیرد */
  advertiserConfirmHours: 72,
  /** حداقل زمان ماندن انتشار قبل از پرداخت (استوری به‌طور طبیعی ۲۴ ساعت می‌ماند) */
  minLiveHours: { story: 24, post: 72, reels: 72 } as Record<PagePublishType, number>,
  /** صاحب پیج «تازه‌وارد» تا این تعداد سفارش پرداخت‌شده: تأخیر بیشتر و سقف مبلغ */
  newOwner: { orders: 3, extraDelayHours: 72, maxAmount: 1_500_000 },
  /** حداقل و حداکثر مبلغ هر واریز */
  deposit: { min: 100_000, max: 1_000_000_000 },
};

const HOUR = 3_600_000;
export const addHours = (d: Date, hours: number): Date => new Date(d.getTime() + hours * HOUR);

const isMoney = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;

/* ------------------------------------------------------------------ */
/* موجودی                                                              */
/* ------------------------------------------------------------------ */

export interface HoldLike {
  amount: number;
  status: string;
}

/**
 * موجودی آزاد = جمع واریزهای تأییدشده − جمع همهٔ بلوکه‌ها به‌جز REFUNDED.
 * (HELD، PAYOUT_DUE، PAID_OUT و DISPUTED همه «مصرف‌شده یا متعهد» حساب می‌شوند.)
 * مبلغ نامعتبر یعنی خطای برنامه‌نویسی و استثنا پرتاب می‌شود.
 */
export function availableBalance(verifiedDeposits: number[], holds: HoldLike[]): number {
  if (!verifiedDeposits.every(isMoney) || !holds.every((h) => isMoney(h.amount))) {
    throw new RangeError("amount must be a non-negative integer");
  }
  const deposited = verifiedDeposits.reduce((s, n) => s + n, 0);
  const committed = holds.filter((h) => h.status !== "REFUNDED").reduce((s, h) => s + h.amount, 0);
  return deposited - committed;
}

/** جمع بلوکه‌های فعال یک کمپین (همه به‌جز REFUNDED). */
export const activeHoldsTotal = (holds: HoldLike[]): number =>
  holds.filter((h) => h.status !== "REFUNDED").reduce((s, h) => s + h.amount, 0);

/* ------------------------------------------------------------------ */
/* تطبیق پیج با کمپین و مجاز بودن درخواست                                */
/* ------------------------------------------------------------------ */

export const isNewOwner = (ownerCompletedOrders: number): boolean => ownerCompletedOrders < POLICY.newOwner.orders;

export interface PricedPage {
  priceStory: number;
  pricePost: number;
  priceReels: number;
}

/**
 * نوع‌هایی از کمپین که این پیج ارائه می‌دهد و تعرفه‌شان در بودجهٔ باقی‌ماندهٔ کمپین می‌گنجد.
 * بازار فقط وقتی پیجی را نشان می‌دهد که این فهرست خالی نباشد.
 */
export function affordableTypes(
  page: PricedPage,
  campaignTypes: PagePublishType[],
  remainingBudget: number,
  ownerCompletedOrders: number,
): PagePublishType[] {
  return campaignTypes.filter((t) => {
    const price = priceForType(page, t);
    if (price <= 0 || price > remainingBudget) return false;
    if (isNewOwner(ownerCompletedOrders) && price > POLICY.newOwner.maxAmount) return false;
    return true;
  });
}

export const CAMPAIGN_OPEN_STATUSES = ["APPROVED", "RUNNING"];

export interface RequestCheckInput {
  advertiserId: string;
  page: PricedPage & { ownerId: string; status: string; category: string };
  type: PagePublishType;
  campaign: {
    advertiserId: string;
    budget: number;
    category: string | null;
    publishTypes: PagePublishType[];
    status: string;
  };
  /** جمع بلوکه‌های فعال همین کمپین (به‌جز REFUNDED) */
  campaignActiveHolds: number;
  /** موجودی آزاد تبلیغ‌دهنده */
  available: number;
  ownerCompletedOrders: number;
}
export type CheckResult = { ok: true; amount: number } | { ok: false; error: string };

/** آیا می‌شود برای این پیج درخواست داد و پولش را بلوکه کرد؟ نتیجه مبلغ بلوکه را هم برمی‌گرداند. */
export function checkHoldRequest(i: RequestCheckInput): CheckResult {
  const fail = (error: string): CheckResult => ({ ok: false, error });
  if (i.campaign.advertiserId !== i.advertiserId) return fail("این کمپین متعلق به شما نیست.");
  if (!CAMPAIGN_OPEN_STATUSES.includes(i.campaign.status)) return fail("این کمپین فعال نیست.");
  if (i.page.status !== "APPROVED") return fail("این پیج در بازار نیست.");
  if (i.page.ownerId === i.advertiserId) return fail("نمی‌توانید پیج خودتان را انتخاب کنید.");
  if (!i.campaign.publishTypes.includes(i.type)) return fail("این نوع انتشار در کمپین شما انتخاب نشده است.");

  const amount = priceForType(i.page, i.type);
  if (amount <= 0) return fail("این پیج این نوع انتشار را ارائه نمی‌دهد.");
  if (i.campaign.category !== null && i.campaign.category !== i.page.category) return fail("دسته‌بندی پیج با کمپین نمی‌خواند.");
  if (isNewOwner(i.ownerCompletedOrders) && amount > POLICY.newOwner.maxAmount) {
    return fail("این پیج تازه‌وارد است و فعلاً سقف مبلغ دارد؛ تعرفهٔ آن از سقف مجاز بیشتر است.");
  }
  if (i.campaignActiveHolds + amount > i.campaign.budget) return fail("بودجهٔ باقی‌ماندهٔ کمپین کافی نیست.");
  if (i.available < amount) return fail("موجودی کافی نیست؛ ابتدا موجودی را شارژ کنید.");
  return { ok: true, amount };
}

/* ------------------------------------------------------------------ */
/* زمان‌بندی پرداخت                                                     */
/* ------------------------------------------------------------------ */

/**
 * زودترین زمانی که مدیر مجاز به پرداخت است:
 * max(زمان تأیید، زمان ثبت مدرک + حداقل زمان ماندن [+ تأخیر صاحب پیج تازه‌وارد]).
 */
export function computePayoutDueAt(i: {
  confirmedAt: Date;
  proofSubmittedAt: Date;
  publishType: PagePublishType;
  newOwner: boolean;
}): Date {
  const hours = POLICY.minLiveHours[i.publishType] + (i.newOwner ? POLICY.newOwner.extraDelayHours : 0);
  const liveUntil = addHours(i.proofSubmittedAt, hours);
  return liveUntil.getTime() > i.confirmedAt.getTime() ? liveUntil : i.confirmedAt;
}

/* ------------------------------------------------------------------ */
/* گردش سفارش و بلوکه                                                   */
/* ------------------------------------------------------------------ */

export type Actor = "OWNER" | "ADVERTISER" | "ADMIN" | "SYSTEM";
export type OrderAction =
  | "accept" | "decline" | "cancel" | "expire" | "submit_proof"
  | "confirm" | "dispute" | "resolve_refund" | "resolve_pay" | "pay";

export interface StepInput {
  action: OrderAction;
  actor: Actor;
  now: Date;
  order: {
    status: string;
    publishType: PagePublishType;
    respondByAt: Date | null;
    publishDeadlineAt: Date | null;
    proofSubmittedAt: Date | null;
  };
  hold: { status: string; payoutDueAt: Date | null } | null;
  /** فقط برای submit_proof */
  proof?: { hasPostLink: boolean; hasStatsScreenshot: boolean };
  /** تعداد سفارش‌های پرداخت‌شدهٔ صاحب پیج؛ برای confirm. ناشناخته = تازه‌وارد (محافظه‌کارانه). */
  ownerCompletedOrders?: number;
  /** فقط برای pay: نتیجهٔ تأیید هویت و نامی که مدیر هنگام انتقال روی کارت دیده است */
  payout?: { verified: boolean; cardHolderName: string; verifiedName: string };
}

export type StepResult =
  | {
      ok: true;
      orderStatus: OrderStatusValue;
      holdStatus: HoldStatusValue;
      /** true یعنی هویت دو طرف از همین لحظه آشکار می‌شود (revealedAt = now) */
      reveal?: true;
      publishDeadlineAt?: Date;
      proofSubmittedAt?: Date;
      payoutDueAt?: Date;
      closedReason?: string;
    }
  | { ok: false; error: string };

const fail = (error: string): StepResult => ({ ok: false, error });

const ALLOWED_ACTORS: Record<OrderAction, Actor[]> = {
  accept: ["OWNER"],
  decline: ["OWNER"],
  cancel: ["ADVERTISER"],
  expire: ["SYSTEM", "ADMIN"],
  submit_proof: ["OWNER"],
  confirm: ["ADVERTISER", "ADMIN"],
  dispute: ["OWNER", "ADVERTISER"],
  resolve_refund: ["ADMIN"],
  resolve_pay: ["ADMIN"],
  pay: ["ADMIN"],
};

/**
 * ماشین حالت سفارش + بلوکه. فقط نتیجه را حساب می‌کند؛ ثبت در دیتابیس با API است
 * (داخل یک transaction و با قفل خوش‌بینانه روی updatedAt تا دو درخواست هم‌زمان رد شوند).
 */
export function nextStep(i: StepInput): StepResult {
  if (!ALLOWED_ACTORS[i.action]?.includes(i.actor)) return fail("این کار برای شما مجاز نیست.");
  if (!i.hold) return fail("بلوکهٔ این سفارش پیدا نشد.");
  const { order, hold, now } = i;
  const s = order.status;
  const h = hold.status;

  switch (i.action) {
    case "accept": {
      if (s !== "REQUESTED" || h !== "HELD") return fail("این درخواست دیگر قابل پذیرش نیست.");
      if (order.respondByAt && now.getTime() > order.respondByAt.getTime()) return fail("مهلت پاسخ به این درخواست تمام شده است.");
      return {
        ok: true, orderStatus: "ACCEPTED", holdStatus: "HELD", reveal: true,
        publishDeadlineAt: addHours(now, POLICY.publishDeadlineHours),
      };
    }

    case "decline": {
      if (s !== "REQUESTED" || h !== "HELD") return fail("این درخواست دیگر قابل رد کردن نیست.");
      return { ok: true, orderStatus: "DECLINED", holdStatus: "REFUNDED", closedReason: "DECLINED_BY_OWNER" };
    }

    case "cancel": {
      // تبلیغ‌دهنده فقط تا قبل از پذیرش می‌تواند لغو کند؛ بعد از آن باید اختلاف ثبت کند.
      if (s !== "REQUESTED" || h !== "HELD") return fail("بعد از پذیرش، لغو مستقیم ممکن نیست؛ اختلاف ثبت کنید.");
      return { ok: true, orderStatus: "CANCELLED", holdStatus: "REFUNDED", closedReason: "CANCELLED_BY_ADVERTISER" };
    }

    case "expire": {
      if (s === "REQUESTED" && h === "HELD" && order.respondByAt && now.getTime() > order.respondByAt.getTime()) {
        return { ok: true, orderStatus: "CANCELLED", holdStatus: "REFUNDED", closedReason: "REQUEST_EXPIRED" };
      }
      if (s === "ACCEPTED" && h === "HELD" && order.publishDeadlineAt && now.getTime() > order.publishDeadlineAt.getTime()) {
        return { ok: true, orderStatus: "CANCELLED", holdStatus: "REFUNDED", closedReason: "PUBLISH_EXPIRED" };
      }
      return fail("مهلتی منقضی نشده است.");
    }

    case "submit_proof": {
      if (s !== "ACCEPTED" || h !== "HELD") return fail("ثبت مدرک در این مرحله ممکن نیست.");
      if (order.publishDeadlineAt && now.getTime() > order.publishDeadlineAt.getTime()) return fail("مهلت انتشار تمام شده است.");
      if (!i.proof?.hasPostLink) return fail("لینک پست را ثبت کنید.");
      if (!i.proof.hasStatsScreenshot) return fail("اسکرین‌شات آمار را ثبت کنید.");
      return { ok: true, orderStatus: "PUBLISHED", holdStatus: "HELD", proofSubmittedAt: now };
    }

    case "confirm": {
      if (s !== "PUBLISHED" || h !== "HELD" || !order.proofSubmittedAt) return fail("تأیید در این مرحله ممکن نیست.");
      if (i.actor === "ADMIN" && now.getTime() < addHours(order.proofSubmittedAt, POLICY.advertiserConfirmHours).getTime()) {
        return fail("هنوز مهلت تأیید تبلیغ‌دهنده تمام نشده است.");
      }
      return {
        ok: true, orderStatus: "CONFIRMED", holdStatus: "PAYOUT_DUE",
        payoutDueAt: computePayoutDueAt({
          confirmedAt: now,
          proofSubmittedAt: order.proofSubmittedAt,
          publishType: order.publishType,
          newOwner: isNewOwner(i.ownerCompletedOrders ?? 0),
        }),
      };
    }

    case "dispute": {
      const stageOk = s === "ACCEPTED" || s === "PUBLISHED" || s === "CONFIRMED";
      const holdOk = h === "HELD" || h === "PAYOUT_DUE";
      if (!stageOk || !holdOk) return fail("ثبت اختلاف در این مرحله ممکن نیست.");
      return { ok: true, orderStatus: "DISPUTED", holdStatus: "DISPUTED" };
    }

    case "resolve_refund": {
      if (s !== "DISPUTED" || h !== "DISPUTED") return fail("این سفارش در وضعیت اختلاف نیست.");
      return { ok: true, orderStatus: "CANCELLED", holdStatus: "REFUNDED", closedReason: "DISPUTE_REFUND" };
    }

    case "resolve_pay": {
      if (s !== "DISPUTED" || h !== "DISPUTED") return fail("این سفارش در وضعیت اختلاف نیست.");
      if (!order.proofSubmittedAt) return fail("بدون مدرک انتشار نمی‌شود پرداخت را تأیید کرد.");
      return { ok: true, orderStatus: "CONFIRMED", holdStatus: "PAYOUT_DUE", payoutDueAt: now };
    }

    case "pay": {
      if (s !== "CONFIRMED" || h !== "PAYOUT_DUE") return fail("این سفارش آمادهٔ پرداخت نیست.");
      if (!hold.payoutDueAt || now.getTime() < hold.payoutDueAt.getTime()) return fail("هنوز زمان مجاز پرداخت نرسیده است.");
      if (!i.payout?.verified) return fail("هویت و کارت صاحب پیج تأیید نشده است.");
      if (!namesMatch(i.payout.cardHolderName, i.payout.verifiedName)) return fail("نام صاحب کارت با نام تأییدشده نمی‌خواند.");
      return { ok: true, orderStatus: "PAID_FULL", holdStatus: "PAID_OUT" };
    }

    default:
      return fail("عمل نامعتبر است.");
  }
}

/* ------------------------------------------------------------------ */
/* واریز تبلیغ‌دهنده                                                    */
/* ------------------------------------------------------------------ */

export type DepositField = "amount" | "reference" | "note";
export type DepositErrors = Partial<Record<DepositField, string>>;
export type DepositParse =
  | { ok: true; data: { amount: number; reference: string; note: string } }
  | { ok: false; errors: DepositErrors };

function toMoney(v: unknown): number | null {
  if (typeof v === "number") return isMoney(v) ? v : null;
  if (typeof v !== "string") return null;
  const t = toLatinDigits(v).replace(/[\s,\u066C\u060C]/g, "");
  return /^\d+$/.test(t) ? Number(t) : null;
}

export function parseDepositInput(raw: Record<string, unknown>): DepositParse {
  const errors: DepositErrors = {};

  const amount = toMoney(raw.amount);
  if (amount === null) errors.amount = "مبلغ را به‌صورت عدد وارد کنید.";
  else if (amount < POLICY.deposit.min || amount > POLICY.deposit.max) {
    errors.amount = `مبلغ واریز باید بین ${POLICY.deposit.min.toLocaleString("en-US")} و ${POLICY.deposit.max.toLocaleString("en-US")} تومان باشد.`;
  }

  const reference = typeof raw.reference === "string" ? toLatinDigits(raw.reference).replace(/\s+/g, "") : "";
  if (!/^[A-Za-z0-9\-_/]{4,30}$/.test(reference)) errors.reference = "شمارهٔ پیگیری رسید را درست وارد کنید (۴ تا ۳۰ حرف یا رقم).";

  const note = typeof raw.note === "string" ? raw.note.trim() : "";
  if (note.length > 300) errors.note = "توضیحات حداکثر ۳۰۰ حرف باشد.";

  if (Object.keys(errors).length > 0 || amount === null) return { ok: false, errors };
  return { ok: true, data: { amount, reference, note } };
}

export type DepositDecision =
  | { ok: true; status: "VERIFIED" | "REJECTED"; reason?: string }
  | { ok: false; error: string };

/** تصمیم مدیر دربارهٔ واریز: فقط از PENDING و رد کردن دلیل لازم دارد. */
export function depositDecision(current: string, action: "verify" | "reject", reason?: unknown): DepositDecision {
  if (current !== "PENDING") return { ok: false, error: "این واریز قبلاً بررسی شده است." };
  if (action === "verify") return { ok: true, status: "VERIFIED" };
  const r = parseRejectReason(reason);
  return r.ok ? { ok: true, status: "REJECTED", reason: r.reason } : r;
}