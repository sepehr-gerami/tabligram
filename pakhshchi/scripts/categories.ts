import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*?)\s*$/);
    if (m) process.env.DATABASE_URL = m[1].replace(/^["']|["']$/g, "");
  }
}
const prisma = new PrismaClient();

async function main() {
  const pages = await prisma.instaPage.groupBy({ by: ["category"], _count: { _all: true } });
  console.log("PAGES", pages);
  const campaigns = await prisma.campaign.groupBy({ by: ["category"], _count: { _all: true } });
  console.log("CAMPAIGNS", campaigns);
}

main().finally(() => prisma.$disconnect());
