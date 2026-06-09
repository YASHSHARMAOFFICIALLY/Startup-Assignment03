import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { fetchRecordsFromOffer } from "@/lib/sheet-sync";
import { authOptions } from "@/lib/auth";
import {
  findOfferById,
  writeRecords,
  checkSyncRateLimit,
} from "@/lib/api-utils";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/offers/[id]/sync
export async function POST(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await props.params;
  const userId = (session.user as { id?: string })?.id;

  const rateLimitError = await checkSyncRateLimit(id);
  if (rateLimitError) {
    return NextResponse.json({ error: rateLimitError }, { status: 429 });
  }

  try {
    const offer = await findOfferById(id);
    if (!offer) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    }

    if (!offer.closerSheetUrl || !offer.phoneSetterSheetUrl || !offer.dmSetterSheetUrl) {
      return NextResponse.json(
        { error: "All three sheet URLs must be configured before syncing." },
        { status: 400 },
      );
    }

    const syncedAt = new Date().toISOString();
    const records = await fetchRecordsFromOffer(offer, syncedAt);

    await writeRecords(id, records);

    await logAudit({
      userId,
      action: "offer_synced",
      resource: "offer",
      resourceId: id,
      detail: `closer: ${records.closer.length}, phone: ${records.phone.length}, dm: ${records.dm.length}`,
    });

    // Bust ISR cache after sync
    revalidatePath("/dashboard");
    revalidatePath("/closer-kpis");
    revalidatePath("/setter-kpis");
    revalidatePath("/leaderboard");
    revalidatePath("/funnel");

    return NextResponse.json({
      offer: { ...offer, lastSynced: syncedAt },
      counts: {
        closer: records.closer.length,
        phone: records.phone.length,
        dm: records.dm.length,
      },
    });
  } catch (e) {
    const raw = e instanceof Error ? e.message : "";
    const safeMessage = raw.includes("Anyone with the link")
      ? "Sheet is not publicly accessible. Make sure sharing is set to 'Anyone with the link can view'."
      : "Failed to sync offer data. Check that sheet URLs are correct and publicly accessible.";

    await logAudit({
      userId,
      action: "offer_sync_failed",
      resource: "offer",
      resourceId: id,
      detail: safeMessage,
    });

    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
