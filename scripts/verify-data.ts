/**
 * Data verification: raw sheet  ->  DB records  ->  dashboard aggregation.
 * Run: npx tsx scripts/verify-data.ts
 *
 * Uses the REAL parsing/aggregation code so it reflects exactly what the
 * dashboard renders. Flags: column misplacement, sheet<->DB drift, staleness.
 */
import { PrismaClient } from "@prisma/client";
import {
  fetchRecordsFromOffer,
  aggregate,
  type RecordsBundle,
  type CloserRecord,
  type PhoneRecord,
  type DmRecord,
} from "../lib/sheet-sync";

const prisma = new PrismaClient();

const money = (n: number) => "$" + Math.round(n).toLocaleString();
const hr = (s = "─") => console.log(s.repeat(72));

function bundleFromDb(rows: { type: string; data: unknown }[]): RecordsBundle {
  const closer: CloserRecord[] = [];
  const phone: PhoneRecord[] = [];
  const dm: DmRecord[] = [];
  for (const r of rows) {
    if (r.type === "closer") closer.push(r.data as CloserRecord);
    else if (r.type === "phone") phone.push(r.data as PhoneRecord);
    else if (r.type === "dm") dm.push(r.data as DmRecord);
  }
  return { closer, phone, dm, syncedAt: "" };
}

// Sum a numeric field across a bundle's three record arrays.
const sum = <T,>(rows: T[], pick: (r: T) => number) =>
  rows.reduce((a, r) => a + (pick(r) || 0), 0);

function compareTotals(label: string, sheet: number, db: number) {
  const match = Math.abs(sheet - db) < 0.005;
  const flag = match ? "  ok " : " DIFF";
  console.log(
    `  [${flag}] ${label.padEnd(22)} sheet=${String(sheet).padStart(12)}  db=${String(db).padStart(12)}`,
  );
  return match;
}

async function main() {
  const offers = await prisma.offer.findMany();
  console.log(`\nVerifying ${offers.length} offer(s)\n`);

  let anyProblem = false;

  for (const offer of offers) {
    hr("=");
    console.log(`OFFER: ${offer.name}`);
    console.log(`  last synced: ${offer.lastSynced?.toISOString() ?? "never"}`);
    hr("=");

    // 1) FRESH parse straight from the sheet
    let fresh: RecordsBundle;
    try {
      fresh = await fetchRecordsFromOffer(offer as never, new Date().toISOString());
    } catch (e) {
      console.log(`  !! could not fetch sheet: ${(e as Error).message}\n`);
      anyProblem = true;
      continue;
    }

    // 2) What is stored in the DB (what the dashboard actually renders)
    const dbRows = await prisma.record.findMany({
      where: { offerId: offer.id },
      select: { type: true, data: true },
    });
    const stored = bundleFromDb(dbRows);

    // ---- Row-count check ----
    console.log("\n  ROW COUNTS  (fresh sheet vs DB)");
    const counts: [string, number, number][] = [
      ["closer", fresh.closer.length, stored.closer.length],
      ["phone", fresh.phone.length, stored.phone.length],
      ["dm", fresh.dm.length, stored.dm.length],
    ];
    for (const [k, f, d] of counts) {
      const ok = f === d;
      if (!ok) anyProblem = true;
      console.log(
        `  [${ok ? "  ok " : " DIFF"}] ${k.padEnd(8)} sheet=${String(f).padStart(5)}  db=${String(d).padStart(5)}` +
          (ok ? "" : "  <-- DB is stale, re-sync needed"),
      );
    }

    // ---- Column-mapping spot check: print first closer row raw vs parsed ----
    console.log("\n  SPOT CHECK  closer[0] parsed fields (is each value in the right field?)");
    const c0 = fresh.closer[0];
    if (c0) {
      console.log(
        `    name=${JSON.stringify(c0.name)} date=${c0.date} totalCalls=${c0.totalCalls} ` +
          `closed=${c0.dealsClosed} revenue=${c0.revenue} cash=${c0.cash} dayRating=${c0.dayRating}`,
      );
      // Sanity heuristics that catch the classic "misplaced column" bug:
      if (c0.cash > 0 && c0.revenue > 0 && c0.cash > c0.revenue)
        console.log("      ?? cash > revenue on first row — worth eyeballing the sheet");
      if (c0.dayRating > 10)
        console.log("      ?? dayRating > 10 — date-decoding may be off (schema divergence)");
      if (!Number.isFinite(c0.cash))
        console.log("      ?? cash is not a number — a text column may be mapped to cash");
    } else {
      console.log("    (no closer rows)");
    }

    // ---- Field-total reconciliation: sheet vs DB on key money/count fields ----
    console.log("\n  FIELD TOTALS  (sheet vs DB — catches silent per-field drift)");
    const checks: boolean[] = [];
    checks.push(compareTotals("closer.revenue", sum(fresh.closer, (r) => r.revenue), sum(stored.closer, (r) => r.revenue)));
    checks.push(compareTotals("closer.cash", sum(fresh.closer, (r) => r.cash), sum(stored.closer, (r) => r.cash)));
    checks.push(compareTotals("closer.dealsClosed", sum(fresh.closer, (r) => r.dealsClosed), sum(stored.closer, (r) => r.dealsClosed)));
    checks.push(compareTotals("phone.booked", sum(fresh.phone, (r) => r.booked), sum(stored.phone, (r) => r.booked)));
    checks.push(compareTotals("phone.cash", sum(fresh.phone, (r) => r.cash), sum(stored.phone, (r) => r.cash)));
    checks.push(compareTotals("dm.booked", sum(fresh.dm, (r) => r.booked), sum(stored.dm, (r) => r.booked)));
    checks.push(compareTotals("dm.revenue", sum(fresh.dm, (r) => r.revenue), sum(stored.dm, (r) => r.revenue)));
    if (checks.some((x) => !x)) anyProblem = true;

    // ---- Dashboard KPIs as rendered (all-time, from DB) ----
    const agg = aggregate(stored, null, null, "All time");
    console.log("\n  DASHBOARD KPIs  (all-time, computed from DB = what the page shows)");
    console.log(`    Cash Collected (closer):  ${money(agg.closerKPIs.cashCollected)}`);
    console.log(`    Total Revenue (closer):   ${money(agg.closerKPIs.totalRevenue)}`);
    console.log(`    Deals Closed:             ${agg.closerKPIs.dealsClosed}`);
    console.log(`    Close Rate:               ${agg.closerKPIs.closeRate}%`);
    console.log(`    Setter Calls Set:         ${agg.setterKPIs.totalCallsSet}`);
    console.log(`    Setter Cash Collected:    ${money(agg.setterKPIs.cashCollected)}`);
    console.log(`    Closers on leaderboard:   ${agg.closers.length}`);
    console.log(`    Setters on leaderboard:   ${agg.setters.length}`);
    console.log("");
  }

  hr("=");
  console.log(anyProblem ? "RESULT: problems found — see DIFF/?? lines above" : "RESULT: all checks passed — sheet, DB and dashboard agree");
  hr("=");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
