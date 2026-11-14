// یک‌بار اصلاح دادهٔ قدیمی: دسته‌بندی‌های فارسی ذخیره‌شده به شناسه‌های معتبر انگلیسی.
// فقط مقادیر شناخته‌شده را تغییر می‌دهد؛ بقیه دست نمی‌خورند.
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*?)\s*$/);
    if (m) process.env.DATABASE_URL = m[1].replace(/^["']|["']$/g, "");
  }
}

const MAP: Record<string, string> = {
  "مد و پوشاک": "fashion",
  "پوشاک و مد": "fashion",
  "غذا و رستوران": "food",
  "فناوری و دیجیتال": "tech",
  "زیبایی و آرایشی": "beauty",
  "گردشگری و سفر": "travel",
  "ورزش و تناسب‌اندام": "sport",
  "آموزش": "education",
  "سلامت": "health",
  "خانه و دکوراسیون": "home",
  "خودرو": "auto",
  "کودک و خانواده": "kids",
  "سرگرمی و طنز": "fun",
  "هنر و عکاسی": "art",
  "کسب‌وکار و خدمات": "business",
  "املاک": "realestate",
  "مالی": "finance",
  "سایر": "other",
};

const prisma = new PrismaClient();

async function main() {
  for (const [from, to] of Object.entries(MAP)) {
    const pages = await prisma.instaPage.updateMany({ where: { category: from }, data: { category: to } });
    const campaigns = await prisma.campaign.updateMany({ where: { category: from }, data: { category: to } });
    if (pages.count || campaigns.count) console.log(`${from} → ${to}: pages=${pages.count} campaigns=${campaigns.count}`);
  }
}

main().finally(() => prisma.$disconnect());
