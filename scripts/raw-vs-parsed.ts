/** Eyeball raw sheet header/row against parsed record. npx tsx scripts/raw-vs-parsed.ts */
import { PrismaClient } from "@prisma/client";
import { parseCSV, normalizeHeader } from "../lib/sheet-sync";

const prisma = new PrismaClient();
const sid = (url: string) => url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)![1];

async function tab(url: string, name: string) {
  const u = `https://docs.google.com/spreadsheets/d/${sid(url)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
  return parseCSV(await (await fetch(u, { cache: "no-store" })).text());
}

async function main() {
  const offer = await prisma.offer.findFirst({ where: { name: "EFF" } });
  if (!offer) return;
  const rows = await tab(offer.closerSheetUrl, "Tally_Closer_Raw");
  const header = rows[0];
  const first = rows.find((r, i) => i > 0 && r.length > 1)!;
  console.log("\nRaw header  ->  raw value  (Tally_Closer_Raw, EFF, first data row)\n");
  header.forEach((h, i) => {
    const norm = normalizeHeader(h);
    console.log(`  [${String(i).padStart(2)}] ${norm.slice(0, 40).padEnd(42)} = ${JSON.stringify(first[i] ?? "")}`);
  });
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
