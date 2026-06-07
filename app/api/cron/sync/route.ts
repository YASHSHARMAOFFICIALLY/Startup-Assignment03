import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchRecordsFromOffer } from "@/lib/sheet-sync";
import { writeRecords } from "@/lib/api-utils";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const SKIP_IF_SYNCED_WITHIN_MS = 4 * 60 * 1000; // 4 minutes

// GET /api/cron/sync — called by Vercel Cron every 5 minutes
export async function GET(request: Request) {
  // Verify cron secret (Vercel sends this automatically)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const offers = await prisma.offer.findMany();
  const results: { id: string; name: string; status: string; counts?: { closer: number; phone: number; dm: number } }[] = [];

  for (const offer of offers) {
    // Skip offers without all 3 sheet URLs
    if (!offer.closerSheetUrl || !offer.phoneSetterSheetUrl || !offer.dmSetterSheetUrl) {
      results.push({ id: offer.id, name: offer.name, status: "skipped — missing sheet URLs" });
      continue;
    }

    // Skip if synced recently
    if (offer.lastSynced) {
      const elapsed = Date.now() - offer.lastSynced.getTime();
      if (elapsed < SKIP_IF_SYNCED_WITHIN_MS) {
        results.push({ id: offer.id, name: offer.name, status: "skipped — synced recently" });
        continue;
      }
    }

    try {
      const syncedAt = new Date().toISOString();
      const records = await fetchRecordsFromOffer(
        {
          id: offer.id,
          name: offer.name,
          closerSheetUrl: offer.closerSheetUrl,
          phoneSetterSheetUrl: offer.phoneSetterSheetUrl,
          dmSetterSheetUrl: offer.dmSetterSheetUrl,
          lastSynced: offer.lastSynced?.toISOString() ?? null,
        },
        syncedAt,
      );

      await writeRecords(offer.id, records);

      const counts = {
        closer: records.closer.length,
        phone: records.phone.length,
        dm: records.dm.length,
      };

      await logAudit({
        action: "cron_sync",
        resource: "offer",
        resourceId: offer.id,
        detail: `closer: ${counts.closer}, phone: ${counts.phone}, dm: ${counts.dm}`,
      });

      results.push({ id: offer.id, name: offer.name, status: "synced", counts });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      await logAudit({
        action: "cron_sync_failed",
        resource: "offer",
        resourceId: offer.id,
        detail: msg,
      });
      results.push({ id: offer.id, name: offer.name, status: `failed — ${msg}` });
    }
  }

  return NextResponse.json({
    syncedAt: new Date().toISOString(),
    offers: results,
  });
}
