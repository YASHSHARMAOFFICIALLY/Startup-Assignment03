import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERIOD_OPTIONS } from "@/lib/period";

const validPeriodKeys: string[] = PERIOD_OPTIONS.map((p) => p.value);

export const updateSettingsSchema = z.object({
  commissionRate: z.number().min(0).max(100).optional(),
  defaultPeriod: z
    .string()
    .refine((v) => validPeriodKeys.includes(v), "Invalid period key.")
    .optional(),
});

export type AppSettings = {
  commissionRate: number;
  defaultPeriod: string;
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
        },
        update: data,
      }),
    { isolationLevel: "Serializable" },
  );
  return {
    commissionRate: row.commissionRate,
    defaultPeriod: row.defaultPeriod,
  };
}
