import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const FIELDS: Record<string, string[]> = {
  closer: ["date", "name", "totalCalls", "noShows", "cancellations", "reschedules", "liveCalls", "offers", "deposits", "dealsClosed", "revenue", "cash", "mrr", "dayRating", "objection", "didWell", "improve", "reviewLink"],
  phone: ["date", "name", "hoursWorked", "pickups", "dials", "qConvos", "shortConvos", "booked", "shows", "noShows", "reschedules", "closed", "revenue", "cash", "dayRating", "objection", "didWell", "improve", "reviewLink"],
  dm: ["date", "name", "convos", "swipeUps", "followUps", "booked", "onCalendar", "liveCalls", "setsClosed", "revenue", "cash", "dayRating", "objection", "didWell", "improve", "reviewLink"],
};

function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  // Block CSV formula injection — sheet values are client-controlled.
  // Plain numbers (e.g. -50) are safe and must stay numeric.
  if (/^[=+\-@]/.test(s) && !Number.isFinite(Number(s))) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

// GET /api/export?type=closer|phone|dm — CSV export of all records (manager only)
export async function GET(request: Request) {
  const me = await getSessionUser();
  if (!me || me.role !== "manager") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "";
  const fields = Object.hasOwn(FIELDS, type) ? FIELDS[type] : undefined;
  if (!fields) {
    return NextResponse.json(
      { error: "Invalid type. Use closer, phone, or dm." },
      { status: 400 },
    );
  }

  try {
    const records = await prisma.record.findMany({
      where: { type },
      orderBy: { date: "asc" },
    });

    const lines = [fields.map(csvCell).join(",")];
    for (const r of records) {
      const data = r.data as Record<string, unknown>;
      lines.push(fields.map((f) => csvCell(data[f])).join(","));
    }

    await logAudit({
      userId: me.id,
      action: "data_exported",
      resource: "record",
      detail: `${type}: ${records.length} rows`,
    });

    return new NextResponse(lines.join("\r\n") + "\r\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-records.csv"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to export records." },
      { status: 500 },
    );
  }
}
