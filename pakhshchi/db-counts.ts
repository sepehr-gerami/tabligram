// Tabligram: take a row-count snapshot of every table BEFORE a migration and compare AFTER it.
// Read-only. Usage from the project root:
//   npx tsx .\db-counts.ts before
//   npx tsx .\db-counts.ts after
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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

const mode = process.argv[2];
if (mode !== "before" && mode !== "after") throw new Error("usage: npx tsx .\\db-counts.ts before|after");

const SNAPSHOT_FILE = "tabligram-counts-before.txt"; // JSON content; ignored by git via tabligram-*.txt
const prisma = new PrismaClient();
const q = (sql: string) => prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql);

async function countRows(): Promise<Record<string, number>> {
  const tables = await q(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations' ORDER BY name",
  );
  const out: Record<string, number> = {};
  for (const t of tables) {
    const name = String(t.name);
    const rows = await q(`SELECT COUNT(*) AS n FROM "${name}"`);
    out[name] = Number(rows[0]?.n ?? 0);
  }
  return out;
}

async function main(): Promise<void> {
  const counts = await countRows();

  if (mode === "before") {
    writeFileSync(SNAPSHOT_FILE, JSON.stringify(counts, null, 2), "utf8");
    console.log("Row counts BEFORE (saved to " + SNAPSHOT_FILE + "):");
    for (const [name, n] of Object.entries(counts)) console.log(`  ${name}: ${n}`);
    return;
  }

  if (!existsSync(SNAPSHOT_FILE)) throw new Error(`${SNAPSHOT_FILE} not found - run the "before" step first.`);
  const before = JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8")) as Record<string, number>;
  let problem = false;

  console.log("== row counts: before -> after ==");
  for (const name of Object.keys({ ...before, ...counts }).sort()) {
    const b = before[name];
    const a = counts[name];
    if (b === undefined) console.log(`  ${name}: (new table) ${a}`);
    else if (a === undefined) { console.log(`  ${name}: ${b} -> MISSING  <-- PROBLEM`); problem = true; }
    else if (a < b) { console.log(`  ${name}: ${b} -> ${a}  <-- LOST ROWS`); problem = true; }
    else console.log(`  ${name}: ${b} -> ${a}  OK`);
  }

  console.log("\n== integrity_check ==");
  const integrity = await q("PRAGMA integrity_check");
  console.log(JSON.stringify(integrity));
  if (String(integrity[0]?.integrity_check) !== "ok") problem = true;

  console.log("== foreign_key_check (empty list = OK) ==");
  const fk = await q("PRAGMA foreign_key_check");
  console.log(JSON.stringify(fk));
  if (fk.length > 0) problem = true;

  console.log("== data fixes ==");
  const emptyTypes = Number((await q("SELECT COUNT(*) AS n FROM \"Campaign\" WHERE \"publishTypes\" = ''"))[0]?.n ?? 0);
  console.log(`  campaigns with an empty publishTypes: ${emptyTypes} ${emptyTypes === 0 ? "(OK)" : "<-- PROBLEM"}`);
  if (emptyTypes !== 0) problem = true;

  console.log("== applied migrations ==");
  console.log(JSON.stringify(await q('SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations" ORDER BY "started_at"'), null, 2));

  console.log(problem ? "\nRESULT: PROBLEM - do not continue; send me this output." : "\nRESULT: OK - no data was lost.");
  if (problem) process.exitCode = 1;
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());