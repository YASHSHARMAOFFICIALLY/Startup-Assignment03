import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { fetchRecordsFromOffer } from "@/lib/sheet-sync";
import { writeRecords } from "@/lib/api-utils";
import { logAudit } from "@/lib/audit";
import { readSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Skip thresholds per auto-sync mode. Note: vercel.json schedules this cron
// DAILY (Hobby plan limit) — "hourly" only takes effect if the platform cron
// actually runs more often than once a day.
const SKIP_THRESHOLD_MS: Record<string, number> = {
  hourly: 55 * 60 * 1000, // 55 minutes
  daily: 20 * 60 * 60 * 1000, // 20 hours
};

// GET /api/cron/sync — called by Vercel Cron (daily on Hobby)
export async function GET(request: Request) {
  // Verify cron secret (required)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const settings = await readSettings();
  if (settings.autoSyncMode === "off") {
    await logAudit({
      action: "cron_sync",
      resource: "settings",
      detail: "skipped: auto-sync off",
    });
    return NextResponse.json({
      syncedAt: new Date().toISOString(),
      offers: [],
      status: "skipped: auto-sync off",
    });
  }
  const skipWithinMs = SKIP_THRESHOLD_MS[settings.autoSyncMode] ?? SKIP_THRESHOLD_MS.daily;

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
      if (elapsed < skipWithinMs) {
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

  // Bust ISR cache for all data pages after sync
  const anySynced = results.some((r) => r.status === "synced");
  if (anySynced) {
    revalidatePath("/dashboard");
    revalidatePath("/closer-kpis");
    revalidatePath("/setter-kpis");
    revalidatePath("/leaderboard");
    revalidatePath("/funnel");
  }

  return NextResponse.json({
    syncedAt: new Date().toISOString(),
    offers: results,
  });
}
