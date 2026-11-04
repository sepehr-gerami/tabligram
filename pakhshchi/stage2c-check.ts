// Tabligram stage 2c (v2): verify the database, then (only if you confirm) convert legacy roles to USER.
// Everything before the y/N prompt is read-only.
// Run from the project root:  npx tsx .\stage2c-check.ts
import { existsSync, readFileSync } from "node:fs";
import * as readline from "node:readline/promises";
import { PrismaClient } from "@prisma/client";

// Prisma Client does not pick up the root .env when started through tsx, so read DATABASE_URL ourselves.
// Only this one variable is read; nothing else from .env is touched or printed.
function loadDatabaseUrl(): void {
  if (process.env.DATABASE_URL) return;
  for (const file of [".env", "prisma/.env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*?)\s*$/);
      if (m) {
        process.env.DATABASE_URL = m[1].replace(/^["']|["']$/g, "");
        return;
      }
    }
  }
}
loadDatabaseUrl();
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not found in .env (run this from the project root).");
console.log("DATABASE_URL loaded (value hidden).");

const prisma = new PrismaClient();

const show = (rows: unknown) =>
  JSON.stringify(rows, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);

const q = (sql: string) => prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql);

// Row counts seen before the migration (from the earlier database inspection).
const EXPECTED: Record<string, number> = {
  User: 3, AdvertiserProfile: 1, PublisherProfile: 1, InstaPage: 2,
  Campaign: 1, Order: 1, Payment: 1, Banner: 2, Session: 0,
};

async function main() {
  console.log("\n== migrations recorded in the database ==");
  console.log(show(await q('SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations" ORDER BY "started_at"')));

  console.log("== integrity_check ==");
  console.log(show(await q("PRAGMA integrity_check")));

  console.log("== foreign_key_check (empty list = OK) ==");
  console.log(show(await q("PRAGMA foreign_key_check")));

  console.log("== row counts (actual vs expected before migration) ==");
  for (const [table, expected] of Object.entries(EXPECTED)) {
    const rows = await q(`SELECT COUNT(*) AS n FROM "${table}"`);
    const actual = Number(rows[0]?.n ?? -1);
    console.log(`${table}: ${actual} (expected ${expected}) ${actual === expected ? "OK" : "<-- DIFFERENT"}`);
  }

  console.log("== roles ==");
  console.log(show(await q('SELECT "role", COUNT(*) AS total FROM "User" GROUP BY "role"')));

  const bad = Number((await q('SELECT COUNT(*) AS n FROM "User" WHERE "role" NOT IN (\'USER\', \'ADMIN\')'))[0]?.n ?? 0);
  if (bad === 0) {
    console.log("No legacy roles. Nothing to change.");
    return;
  }

  console.log(`\n${bad} user(s) have a legacy role that the current schema (USER/ADMIN) does not know.`);
  console.log("Their advertiser/publisher profiles are NOT touched; only the role column changes to USER.");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question("Convert them to USER now? (y/N): ")).trim().toLowerCase();
  rl.close();
  if (answer !== "y") {
    console.log("Skipped. No data was changed.");
    return;
  }

  const changed = await prisma.$executeRawUnsafe(
    'UPDATE "User" SET "role" = \'USER\' WHERE "role" NOT IN (\'USER\', \'ADMIN\')',
  );
  console.log(`Updated ${changed} row(s).`);
  console.log(show(await q('SELECT "role", COUNT(*) AS total FROM "User" GROUP BY "role"')));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());