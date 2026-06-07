import { prisma } from "@/lib/db";

export async function logAudit(params: {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  detail?: string;
  ip?: string;
}) {
  try {
    await prisma.auditLog.create({ data: params });
  } catch {
    // Audit logging should never break the request
    console.error("Failed to write audit log:", params.action);
  }
}
