import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/data/clear — delete ALL synced records (manager only)
export async function POST() {
  const me = await getSessionUser();
  if (!me || me.role !== "manager") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  try {
    const { count } = await prisma.record.deleteMany();
    // Reset sync timestamps so the next sync re-imports fresh data
    // instead of cron skipping offers it thinks were recently synced.
    await prisma.offer.updateMany({ data: { lastSynced: null } });

    await logAudit({
      userId: me.id,
      action: "data_cleared",
      resource: "record",
      detail: `deleted ${count} records`,
    });

    return NextResponse.json({ deleted: count });
  } catch {
    return NextResponse.json(
      { error: "Failed to clear records." },
      { status: 500 },
    );
  }
}
