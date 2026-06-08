import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Offer } from "@/lib/types";
import type { RecordsBundle, CloserRecord, PhoneRecord, DmRecord } from "@/lib/sheet-sync";

/* ─── Validation schemas ─────────────────────────────────────────── */

const SHEETS_URL_REGEX = /^https:\/\/docs\.google\.com\/spreadsheets\/d\//;

export const createOfferSchema = z.object({
  name: z
    .string()
    .min(1, "Offer name is required.")
    .max(200, "Offer name must be under 200 characters."),
  closerSheetUrl: z.string().regex(SHEETS_URL_REGEX, "Invalid Google Sheets URL.").or(z.literal("")),
  phoneSetterSheetUrl: z.string().regex(SHEETS_URL_REGEX, "Invalid Google Sheets URL.").or(z.literal("")),
  dmSetterSheetUrl: z.string().regex(SHEETS_URL_REGEX, "Invalid Google Sheets URL.").or(z.literal("")),
});

export const updateOfferSchema = z.object({
  name: z
    .string()
    .min(1, "Offer name is required.")
    .max(200, "Offer name must be under 200 characters.")
    .optional(),
  closerSheetUrl: z.string().regex(SHEETS_URL_REGEX, "Invalid Google Sheets URL.").or(z.literal("")).optional(),
  phoneSetterSheetUrl: z.string().regex(SHEETS_URL_REGEX, "Invalid Google Sheets URL.").or(z.literal("")).optional(),
  dmSetterSheetUrl: z.string().regex(SHEETS_URL_REGEX, "Invalid Google Sheets URL.").or(z.literal("")).optional(),
});

/* ─── Offer operations ───────────────────────────────────────────── */

export async function readOffers(): Promise<Offer[]> {
  const offers = await prisma.offer.findMany({
    orderBy: { createdAt: "desc" },
  });
  return offers.map((o) => ({
    id: o.id,
    name: o.name,
    closerSheetUrl: o.closerSheetUrl,
    phoneSetterSheetUrl: o.phoneSetterSheetUrl,
    dmSetterSheetUrl: o.dmSetterSheetUrl,
    lastSynced: o.lastSynced?.toISOString() ?? null,
  }));
}

export async function createOffer(data: z.infer<typeof createOfferSchema>): Promise<Offer> {
  const offer = await prisma.offer.create({ data });
  return {
    id: offer.id,
    name: offer.name,
    closerSheetUrl: offer.closerSheetUrl,
    phoneSetterSheetUrl: offer.phoneSetterSheetUrl,
    dmSetterSheetUrl: offer.dmSetterSheetUrl,
    lastSynced: null,
  };
}

export async function updateOffer(
  id: string,
  data: z.infer<typeof updateOfferSchema>,
): Promise<Offer | null> {
  const existing = await prisma.offer.findUnique({ where: { id } });
  if (!existing) return null;

  const updated = await prisma.offer.update({
    where: { id },
    data,
  });
  return {
    id: updated.id,
    name: updated.name,
    closerSheetUrl: updated.closerSheetUrl,
    phoneSetterSheetUrl: updated.phoneSetterSheetUrl,
    dmSetterSheetUrl: updated.dmSetterSheetUrl,
    lastSynced: updated.lastSynced?.toISOString() ?? null,
  };
}

export async function deleteOffer(id: string): Promise<boolean> {
  const existing = await prisma.offer.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.offer.delete({ where: { id } });
  return true;
}

export async function findOfferById(id: string): Promise<Offer | null> {
  const offer = await prisma.offer.findUnique({ where: { id } });
  if (!offer) return null;
  return {
    id: offer.id,
    name: offer.name,
    closerSheetUrl: offer.closerSheetUrl,
    phoneSetterSheetUrl: offer.phoneSetterSheetUrl,
    dmSetterSheetUrl: offer.dmSetterSheetUrl,
    lastSynced: offer.lastSynced?.toISOString() ?? null,
  };
}

/* ─── Record operations ──────────────────────────────────────────── */

export async function writeRecords(
  offerId: string,
  bundle: RecordsBundle,
): Promise<void> {
  const syncedAt = new Date(bundle.syncedAt);

  await prisma.$transaction([
    // Delete old records for this offer
    prisma.record.deleteMany({ where: { offerId } }),
    // Insert closer records
    prisma.record.createMany({
      data: bundle.closer.map((r) => ({
        offerId,
        type: "closer",
        date: r.date,
        name: r.name,
        data: JSON.parse(JSON.stringify(r)),
        syncedAt,
      })),
    }),
    // Insert phone records
    prisma.record.createMany({
      data: bundle.phone.map((r) => ({
        offerId,
        type: "phone",
        date: r.date,
        name: r.name,
        data: JSON.parse(JSON.stringify(r)),
        syncedAt,
      })),
    }),
    // Insert DM records
    prisma.record.createMany({
      data: bundle.dm.map((r) => ({
        offerId,
        type: "dm",
        date: r.date,
        name: r.name,
        data: JSON.parse(JSON.stringify(r)),
        syncedAt,
      })),
    }),
    // Update offer lastSynced
    prisma.offer.update({
      where: { id: offerId },
      data: { lastSynced: syncedAt },
    }),
  ]);
}

export async function readAllRecords(offerId?: string): Promise<RecordsBundle> {
  const where = offerId ? { offerId } : {};
  const records = await prisma.record.findMany({ where });

  const closer: CloserRecord[] = [];
  const phone: PhoneRecord[] = [];
  const dm: DmRecord[] = [];
  let latestSync = "";

  for (const r of records) {
    const data = r.data as Record<string, unknown>;
    const syncStr = r.syncedAt.toISOString();
    if (syncStr > latestSync) latestSync = syncStr;

    if (r.type === "closer") closer.push(data as unknown as CloserRecord);
    else if (r.type === "phone") phone.push(data as unknown as PhoneRecord);
    else if (r.type === "dm") dm.push(data as unknown as DmRecord);
  }

  return { closer, phone, dm, syncedAt: latestSync };
}

/* ─── Rate limiting (DB-based, survives restarts + serverless) ──── */

const SYNC_COOLDOWN_MS = 30_000;

export async function checkSyncRateLimit(offerId: string): Promise<string | null> {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: { lastSynced: true },
  });
  if (offer?.lastSynced) {
    const elapsed = Date.now() - offer.lastSynced.getTime();
    if (elapsed < SYNC_COOLDOWN_MS) {
      const waitSec = Math.ceil((SYNC_COOLDOWN_MS - elapsed) / 1000);
      return `Rate limited. Try again in ${waitSec}s.`;
    }
  }
  return null;
}

/* ─── Error helpers ──────────────────────────────────────────────── */

export function zodError(error: z.ZodError<unknown>) {
  return {
    error: "Validation failed.",
    details: error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    })),
  };
}

/* ─── Rep operations ─────────────────────────────────────────────── */

export const createRepSchema = z.object({
  displayName: z.string().min(1, "Display name is required.").max(200),
  aliases: z.array(z.string()).default([]),
  roles: z.array(z.enum(["closer", "phone", "dm"])).default([]),
  targets: z.record(z.string(), z.number()).default({}),
});

export const updateRepSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  aliases: z.array(z.string()).optional(),
  roles: z.array(z.enum(["closer", "phone", "dm"])).optional(),
  status: z.enum(["active", "archived"]).optional(),
  targets: z.record(z.string(), z.number()).optional(),
});

export type RepRow = {
  id: string;
  displayName: string;
  aliases: string[];
  roles: string[];
  status: string;
  targets: Record<string, number>;
  createdAt: string;
};

function toRepRow(r: {
  id: string;
  displayName: string;
  aliases: string[];
  roles: string[];
  status: string;
  targets: unknown;
  createdAt: Date;
}): RepRow {
  return {
    id: r.id,
    displayName: r.displayName,
    aliases: r.aliases,
    roles: r.roles,
    status: r.status,
    targets: (r.targets ?? {}) as Record<string, number>,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function readReps(status?: string): Promise<RepRow[]> {
  const where = status ? { status } : {};
  const reps = await prisma.rep.findMany({ where, orderBy: { displayName: "asc" } });
  return reps.map(toRepRow);
}

export async function createRep(
  data: z.infer<typeof createRepSchema>,
): Promise<RepRow> {
  const rep = await prisma.rep.create({ data });
  return toRepRow(rep);
}

export async function updateRep(
  id: string,
  data: z.infer<typeof updateRepSchema>,
): Promise<RepRow | null> {
  const existing = await prisma.rep.findUnique({ where: { id } });
  if (!existing) return null;
  const updated = await prisma.rep.update({ where: { id }, data });
  return toRepRow(updated);
}

export async function deleteRep(id: string): Promise<boolean> {
  const existing = await prisma.rep.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.rep.delete({ where: { id } });
  return true;
}

export async function checkAliasConflict(
  aliases: string[],
  excludeRepId?: string,
): Promise<string | null> {
  const reps = await prisma.rep.findMany({
    select: { id: true, displayName: true, aliases: true },
  });
  for (const alias of aliases) {
    const lower = alias.toLowerCase().trim();
    if (!lower) continue;
    for (const rep of reps) {
      if (excludeRepId && rep.id === excludeRepId) continue;
      if (
        rep.aliases.some((a) => a.toLowerCase().trim() === lower) ||
        rep.displayName.toLowerCase().trim() === lower
      ) {
        return `"${alias}" is already used by ${rep.displayName}.`;
      }
    }
  }
  return null;
}

export async function buildAliasMap(): Promise<Map<string, string>> {
  const reps = await prisma.rep.findMany({
    select: { displayName: true, aliases: true },
  });
  const map = new Map<string, string>();
  for (const rep of reps) {
    map.set(rep.displayName, rep.displayName);
    for (const alias of rep.aliases) {
      map.set(alias, rep.displayName);
    }
  }
  return map;
}

export async function buildNameToRepIdMap(): Promise<Map<string, string>> {
  const reps = await prisma.rep.findMany({
    select: { id: true, displayName: true, aliases: true },
  });
  const map = new Map<string, string>();
  for (const rep of reps) {
    map.set(rep.displayName, rep.id);
    for (const alias of rep.aliases) {
      map.set(alias, rep.id);
    }
  }
  return map;
}
