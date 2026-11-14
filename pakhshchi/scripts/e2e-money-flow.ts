// تست سرتاسری جریان پول از طریق API واقعی.
// اجرا: npx tsx scripts/e2e-money-flow.ts
// پیش‌نیاز: dev server روی http://localhost:3000 و داده‌های seed.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";
const ORIGIN = BASE;
const prisma = new PrismaClient();

const ADVERTISER = { mobile: "09121111111", password: "Demo@12345" };
const PUBLISHER = { mobile: "09122222222", password: "Demo@12345" };
const ADMIN = { mobile: "09120000000", password: "Admin@12345" };
const TARGET_PAGE_ID = "cmvwoub2u0006v7lszbood85n";
const TARGET_PAGE_HANDLE = "@mode_dar_tehran";
const POST_PRICE = 1_500_000;
const BUDGET = 2_000_000;
const COMMISSION = 150_000;
const PUBLISHER_AMOUNT = 1_350_000;

type Json = Record<string, unknown> | unknown[];

class ApiClient {
  private cookie = "";
  private label: string;

  constructor(label: string) {
    this.label = label;
  }

  private captureCookie(res: Response) {
    const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    const raw = list[0] ?? res.headers.get("set-cookie") ?? "";
    const pair = raw.split(";")[0]?.trim();
    if (pair?.startsWith("tabligram_session=")) this.cookie = pair;
  }

  async request(
    method: string,
    route: string,
    options: { json?: unknown; body?: BodyInit; headers?: Record<string, string>; expected?: number } = {},
  ): Promise<{ status: number; data: Json | null }> {
    const headers: Record<string, string> = {
      Origin: ORIGIN,
      ...(this.cookie ? { Cookie: this.cookie } : {}),
      ...options.headers,
    };
    let body = options.body;
    if (options.json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.json);
    }
    const res = await fetch(`${BASE}${route}`, { method, headers, body });
    this.captureCookie(res);
    const text = await res.text();
    let data: Json | null = null;
    if (text) {
      try {
        data = JSON.parse(text) as Json;
      } catch {
        data = { raw: text.slice(0, 500) };
      }
    }
    const expected = options.expected;
    if (expected !== undefined) {
      assert.equal(
        res.status,
        expected,
        `${this.label} ${method} ${route} -> ${res.status} (expected ${expected}): ${JSON.stringify(data)}`,
      );
    } else if (res.status >= 400) {
      throw new Error(`${this.label} ${method} ${route} -> ${res.status}: ${JSON.stringify(data)}`);
    }
    return { status: res.status, data };
  }

  get(route: string, expected?: number) {
    return this.request("GET", route, { expected });
  }
  post(route: string, json: unknown, expected?: number) {
    return this.request("POST", route, { json, expected });
  }
  put(route: string, json: unknown, expected?: number) {
    return this.request("PUT", route, { json, expected });
  }
  upload(route: string, bytes: Buffer, contentType: string, expected = 201) {
    return this.request("POST", route, {
      body: bytes as unknown as BodyInit,
      headers: { "Content-Type": contentType },
      expected,
    });
  }
}

const log = (step: string, detail?: unknown) => {
  console.log(`\n== ${step} ==`);
  if (detail !== undefined) console.log(JSON.stringify(detail, null, 2));
};

const asRecord = (v: unknown): Record<string, unknown> => {
  assert.ok(v && typeof v === "object" && !Array.isArray(v), "expected object");
  return v as Record<string, unknown>;
};
const asArray = (v: unknown): unknown[] => {
  assert.ok(Array.isArray(v), "expected array");
  return v;
};
const num = (v: unknown): number => {
  assert.equal(typeof v, "number", `expected number, got ${typeof v}`);
  return v as number;
};
const str = (v: unknown): string => {
  assert.equal(typeof v, "string", `expected string, got ${typeof v}`);
  return v as string;
};

async function main() {
  const stamp = Date.now();
  const advertiser = new ApiClient("advertiser");
  const publisher = new ApiClient("publisher");
  const admin = new ApiClient("admin");

  log("0. سرور و داده‌های seed");
  const health = await new ApiClient("anon").get("/api/market/pages?limit=1", 200);
  assert.ok(asArray(health.data).length >= 1, "market pages empty");
  const pageRow = await prisma.instaPage.findUnique({
    where: { id: TARGET_PAGE_ID },
    select: { id: true, handle: true, status: true, pricePost: true, ownerId: true },
  });
  assert.ok(pageRow, "target page not found");
  assert.equal(pageRow.status, "APPROVED");
  assert.equal(pageRow.pricePost, POST_PRICE);
  const publisherUser = await prisma.user.findUnique({ where: { mobile: PUBLISHER.mobile }, select: { id: true } });
  assert.ok(publisherUser, "publisher user not found");
  assert.equal(pageRow.ownerId, publisherUser.id, "target page owner mismatch");

  log("1. ورود سه نقش");
  const advLogin = await advertiser.post("/api/auth/login", ADVERTISER, 200);
  const pubLogin = await publisher.post("/api/auth/login", PUBLISHER, 200);
  const admLogin = await admin.post("/api/auth/login", ADMIN, 200);
  assert.ok(advLogin.data && pubLogin.data && admLogin.data);

  log("2. آپلود رسید و ثبت واریز توسط تبلیغ‌دهنده");
  const png = await readFile(path.join(process.cwd(), "storage", "banners", "310584586f00806d41002c6f95900f60.png"));
  const receipt = await advertiser.upload("/api/uploads?kind=receipt", png, "image/png");
  const receiptUrl = str(asRecord(receipt.data).url);
  assert.match(receiptUrl, /^\/api\/files\/uploads\//);

  const reference = `E2E-${stamp}`;
  const depositRes = await advertiser.post(
    "/api/deposits",
    { amount: BUDGET, reference, note: "واریز تست جریان کامل", receiptUrl },
    201,
  );
  const depositId = str(asRecord(asRecord(depositRes.data).deposit).id);

  log("3. تأیید واریز توسط مدیر");
  const deposits = await admin.get("/api/admin/deposits?status=PENDING", 200);
  const pending = asArray(deposits.data).map(asRecord).find((d) => d.id === depositId);
  assert.ok(pending, "deposit not in admin pending list");
  await admin.post(`/api/admin/deposits/${depositId}/decision`, { action: "verify" }, 200);

  const walletAfterDeposit = await advertiser.get("/api/wallet", 200);
  const summary = asRecord(asRecord(walletAfterDeposit.data).summary);
  assert.equal(num(summary.available), BUDGET, "available after verified deposit");
  log("کیف پول بعد از تأیید", summary);

  log("4. ساخت کمپین و بلوکهٔ خودکار برای پیج هدف");
  const campaignRes = await advertiser.post(
    "/api/campaigns",
    {
      title: "کمپین تست سرتاسری جریان پول",
      business: "فروشگاه تست تبلیگرام",
      description: "این کمپین برای بررسی کامل جریان بلوکه، انتشار، تأیید و پرداخت ساخته شده است.",
      link: "https://example.com/e2e",
      budget: BUDGET,
      publishTypes: ["post"],
      category: "fashion",
      city: "تهران",
      notes: "تست خودکار جریان پول",
      pageCount: 1,
      targetPageId: TARGET_PAGE_ID,
      targetPublishType: "post",
    },
    201,
  );
  const campaign = asRecord(asRecord(campaignRes.data).campaign);
  const campaignId = str(campaign.id);
  assert.equal(num(campaign.budget), BUDGET);
  assert.equal(num(asRecord(asRecord(campaignRes.data).dispatch).created), 1);
  log("پاسخ ساخت کمپین", campaignRes.data);

  const campaigns = await advertiser.get("/api/campaigns", 200);
  const campaignRow = asArray(campaigns.data).map(asRecord).find((c) => c.id === campaignId);
  assert.ok(campaignRow, "campaign not in advertiser list");
  const orders = asArray(campaignRow.orders).map(asRecord);
  assert.equal(orders.length, 1, "expected exactly one dispatched order");
  const order = orders[0];
  const orderId = str(order.id);
  const hold = asRecord(order.hold);
  assert.equal(str(asRecord(order.page).id), TARGET_PAGE_ID);
  assert.equal(str(order.status), "REQUESTED");
  assert.equal(num(order.amount), POST_PRICE);
  assert.equal(str(hold.status), "HELD");
  assert.equal(num(hold.amount), POST_PRICE);
  assert.equal(num(hold.commission), COMMISSION);
  assert.equal(num(hold.publisherAmount), PUBLISHER_AMOUNT);
  assert.equal(num(campaignRow.blocked), POST_PRICE);
  assert.equal(num(campaignRow.remainingBudget), BUDGET - POST_PRICE);
  log("سفارش و بلوکه پس از توزیع", { orderId, status: order.status, hold });

  const walletAfterCampaign = await advertiser.get("/api/wallet", 200);
  assert.equal(num(asRecord(asRecord(walletAfterCampaign.data).summary).available), BUDGET - POST_PRICE);

  log("5. پذیرش درخواست توسط صاحب پیج");
  const pubOrders = await publisher.get("/api/publisher/orders", 200);
  const pubOrder = asArray(asRecord(pubOrders.data).orders).map(asRecord).find((o) => o.id === orderId);
  assert.ok(pubOrder, "order not in publisher list");
  assert.equal(str(pubOrder.status), "REQUESTED");
  await publisher.post(`/api/orders/${orderId}/respond`, { action: "accept" }, 200);

  log("6. ثبت مدرک انتشار");
  const stats = await publisher.upload("/api/uploads?kind=proof", png, "image/png");
  const statsImage = str(asRecord(stats.data).url);
  const postLink = `https://www.instagram.com/p/E2E${stamp}/`;
  await publisher.post(
    `/api/orders/${orderId}/proof`,
    { postLink, statsImage, caption: "مدرک تست خودکار" },
    200,
  );

  const advOrderView = await advertiser.get(`/api/orders/${orderId}`, 200);
  const advView = asRecord(advOrderView.data);
  assert.equal(str(advView.status), "PUBLISHED");
  assert.equal(str(advView.viewer), "ADVERTISER");
  const proofs = asArray(advView.proofs).map(asRecord);
  assert.equal(proofs.length, 2);
  assert.ok(proofs.some((p) => p.kind === "POST_LINK" && p.proofUrl === postLink));
  assert.ok(proofs.some((p) => p.kind === "STATS_SCREENSHOT" && p.proofUrl === statsImage));

  log("7. تأیید انتشار توسط تبلیغ‌دهنده");
  await advertiser.post(`/api/orders/${orderId}/confirm`, {}, 200);
  const confirmed = asRecord((await advertiser.get(`/api/orders/${orderId}`, 200)).data);
  assert.equal(str(confirmed.status), "CONFIRMED");
  assert.equal(str(asRecord(confirmed.hold).status), "PAYOUT_DUE");

  log("8. ثبت و تأیید کارت پرداخت صاحب پیج");
  const profilePut = await publisher.put(
    "/api/publisher/payout-profile",
    { firstName: "علی", lastName: "رضایی", nationalId: "1234567891", cardNumber: "4111111111111111" },
    200,
  );
  assert.equal(str(asRecord(profilePut.data).payoutStatus), "PENDING");
  const pendingProfiles = await admin.get("/api/admin/publishers?status=PENDING", 200);
  const profile = asArray(pendingProfiles.data).map(asRecord).find((p) => p.userId === publisherUser.id);
  assert.ok(profile, "publisher payout profile not pending");
  await admin.post(`/api/admin/publishers/${str(profile.id)}/decision`, { action: "approve" }, 200);

  log("9. پرداخت توسط مدیر (کمیسیون ۱۰٪ کسر می‌شود)");
  const payouts = await admin.get("/api/admin/payouts", 200);
  const payout = asArray(payouts.data).map(asRecord).find((p) => str(asRecord(p.order).id) === orderId);
  assert.ok(payout, "hold not in admin payouts");
  const payoutHoldId = str(payout.holdId);
  assert.equal(str(payout.holdStatus), "PAYOUT_DUE");
  assert.equal(num(payout.amount), POST_PRICE);
  assert.equal(num(payout.commission), COMMISSION);
  assert.equal(num(payout.publisherAmount), PUBLISHER_AMOUNT);
  assert.equal(payout.timeReached, true, "payout time not reached (TABLIGRAM_FAST_PAYOUT?)");
  const payoutReference = `E2E-PAY-${stamp}`;
  const payRes = await admin.post(`/api/admin/payouts/${payoutHoldId}/pay`, { payoutReference }, 200);
  assert.equal(num(asRecord(payRes.data).paid), PUBLISHER_AMOUNT);
  assert.equal(num(asRecord(payRes.data).commission), COMMISSION);
  assert.equal(str(asRecord(payRes.data).cardLast4), "1111");
  log("پاسخ پرداخت", payRes.data);

  log("10. بررسی نهایی وضعیت‌ها و مبالغ");
  const finalView = asRecord((await advertiser.get(`/api/orders/${orderId}`, 200)).data);
  assert.equal(str(finalView.status), "PAID_FULL");
  const finalHold = asRecord(finalView.hold);
  assert.equal(str(finalHold.status), "PAID_OUT");
  assert.equal(num(finalHold.amount), POST_PRICE);
  assert.equal(num(finalHold.commission), COMMISSION);
  assert.equal(num(finalHold.publisherAmount), PUBLISHER_AMOUNT);

  const finalWallet = asRecord((await advertiser.get("/api/wallet", 200)).data);
  assert.equal(num(asRecord(finalWallet.summary).available), BUDGET - POST_PRICE);
  const finalPubOrders = asRecord((await publisher.get("/api/publisher/orders", 200)).data);
  const finalPubOrder = asArray(finalPubOrders.orders).map(asRecord).find((o) => o.id === orderId);
  assert.ok(finalPubOrder);
  assert.equal(str(finalPubOrder.status), "PAID_FULL");

  const dbOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      amount: true,
      hold: { select: { status: true, amount: true, commission: true, publisherAmount: true, payoutReference: true, paidOutAt: true } },
      campaign: { select: { id: true, budget: true } },
      page: { select: { id: true, handle: true } },
    },
  });
  assert.ok(dbOrder);
  assert.equal(dbOrder.status, "PAID_FULL");
  assert.equal(dbOrder.hold?.status, "PAID_OUT");
  assert.equal(dbOrder.hold?.commission, COMMISSION);
  assert.equal(dbOrder.hold?.publisherAmount, PUBLISHER_AMOUNT);
  assert.equal(dbOrder.hold?.payoutReference, payoutReference);
  assert.ok(dbOrder.hold?.paidOutAt instanceof Date);
  assert.equal(dbOrder.page.id, TARGET_PAGE_ID);
  assert.equal(dbOrder.page.handle, TARGET_PAGE_HANDLE);
  log("رکورد نهایی دیتابیس", dbOrder);

  const audit = await prisma.auditLog.findFirst({
    where: { action: "HOLD_PAYOUT", entityId: payoutHoldId },
    select: { action: true, meta: true, createdAt: true },
  });
  assert.ok(audit, "HOLD_PAYOUT audit log missing");
  const auditMeta = JSON.parse(audit.meta ?? "{}") as Record<string, unknown>;
  assert.equal(auditMeta.commission, COMMISSION);
  assert.equal(auditMeta.publisherAmount, PUBLISHER_AMOUNT);
  assert.equal(auditMeta.payoutReference, payoutReference);
  log("لاگ حسابرسی پرداخت", audit);

  console.log("\n✅ E2E PASSED: deposit → campaign → hold → accept → proof → confirm → payout (10% commission).");
  console.log(JSON.stringify({ campaignId, orderId, holdId: payoutHoldId, depositId, payoutReference }, null, 2));
}

main()
  .catch((err) => {
    console.error("\n❌ E2E FAILED");
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
