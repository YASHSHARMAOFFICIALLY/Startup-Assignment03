import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERIOD_OPTIONS } from "@/lib/period";
import { navItems } from "@/lib/nav-config";

const validPeriodKeys: string[] = PERIOD_OPTIONS.map((p) => p.value);
const validLandingPages: string[] = navItems.map((i) => i.href);

export const updateSettingsSchema = z.object({
  commissionRate: z.number().min(0).max(100).optional(),
  defaultPeriod: z
    .string()
    .refine((v) => validPeriodKeys.includes(v), "Invalid period key.")
    .optional(),
  autoSyncMode: z.enum(["off", "daily", "hourly"]).optional(),
  defaultLandingPage: z
    .string()
    .refine((v) => validLandingPages.includes(v), "Invalid landing page.")
    .optional(),
  leaderboardRows: z.number().int().min(3).max(25).optional(),
});

export type AppSettings = {
  commissionRate: number;
  defaultPeriod: string;
  autoSyncMode: string;
  defaultLandingPage: string;
  leaderboardRows: number;
};

export async function readSettings(): Promise<AppSettings> {
  const row = await prisma.$transaction(
    async (tx) =>
      tx.settings.upsert({
        where: { id: "default" },
        create: {},
        update: {},
      }),
    { isolationLevel: "Serializable" },
  );
  return {
    commissionRate: row.commissionRate,
    defaultPeriod: row.defaultPeriod,
    autoSyncMode: row.autoSyncMode,
    defaultLandingPage: row.defaultLandingPage,
    leaderboardRows: row.leaderboardRows,
  };
}

export async function updateSettings(
  data: z.infer<typeof updateSettingsSchema>,
): Promise<AppSettings> {
  const row = await prisma.$transaction(
    async (tx) =>
      tx.settings.upsert({
        where: { id: "default" },
        create: {
          commissionRate: data.commissionRate ?? 0,
          defaultPeriod: data.defaultPeriod ?? "last-month",
          autoSyncMode: data.autoSyncMode ?? "daily",
          defaultLandingPage: data.defaultLandingPage ?? "/dashboard",
          leaderboardRows: data.leaderboardRows ?? 5,
        },
        update: data,
      }),
    { isolationLevel: "Serializable" },
  );
  return {
    commissionRate: row.commissionRate,
    defaultPeriod: row.defaultPeriod,
    autoSyncMode: row.autoSyncMode,
    defaultLandingPage: row.defaultLandingPage,
    leaderboardRows: row.leaderboardRows,
  };
}
