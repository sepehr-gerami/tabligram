// Read-only snapshot of the current database state (safe to run any time).
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*?)\s*$/);
    if (m) process.env.DATABASE_URL = m[1].replace(/^["']|["']$/g, "");
  }
}

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, mobile: true, name: true, role: true, status: true },
    orderBy: { createdAt: "asc" },
  });
  const adv = await prisma.advertiserProfile.findMany({ select: { userId: true, businessName: true } });
  const pub = await prisma.publisherProfile.findMany({ select: { userId: true, payoutStatus: true, cardLast4: true } });
  console.log("USERS", users.length);
  for (const u of users) {
    console.log(` ${u.mobile} ${u.role} ${u.status} ${u.name} adv=${adv.some((a) => a.userId === u.id)} pub=${pub.some((p) => p.userId === u.id)}`);
  }

  const campaigns = await prisma.campaign.findMany({
    select: { id: true, orderNumber: true, title: true, budget: true, status: true, publishTypes: true, advertiserId: true, category: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("\nCAMPAIGNS", campaigns.length);
  for (const c of campaigns) console.log(` ${c.orderNumber} ${c.status} budget=${c.budget} types=${c.publishTypes} cat=${c.category} ${c.title}`);

  const pages = await prisma.instaPage.findMany({
    select: { id: true, handle: true, title: true, status: true, category: true, ownerId: true, priceStory: true, pricePost: true, priceReels: true },
  });
  console.log("\nPAGES", pages.length);
  for (const p of pages) console.log(` ${p.handle} ${p.status} cat=${p.category} prices=${p.priceStory}/${p.pricePost}/${p.priceReels} ${p.title}`);

  const orders = await prisma.order.findMany({
    select: { id: true, status: true, amount: true, campaignId: true, pageId: true, publishType: true, hold: { select: { status: true, amount: true } } },
    orderBy: { createdAt: "desc" },
  });
  console.log("\nORDERS", orders.length);
  for (const o of orders) console.log(` ${o.status} amount=${o.amount} type=${o.publishType} hold=${o.hold?.status}/${o.hold?.amount}`);

  const deposits = await prisma.deposit.findMany({ select: { userId: true, amount: true, status: true, reference: true } });
  console.log("\nDEPOSITS", deposits.length);
  for (const d of deposits) console.log(` ${d.status} amount=${d.amount} ref=${d.reference}`);

  const banners = await prisma.banner.findMany({ select: { title: true, placement: true, isActive: true, desktopImage: true } });
  console.log("\nBANNERS", banners.length);
  for (const b of banners) console.log(` ${b.placement} active=${b.isActive} img=${b.desktopImage ?? "-"} ${b.title}`);
}

main().finally(() => prisma.$disconnect());
