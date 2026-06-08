import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
}

export async function verifyPassword(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    await logAudit({
      action: "login_failed",
      resource: "user",
      detail: `Unknown email attempt (${email.slice(0, 3)}***)`,
    });
    return null;
  }

  // Check account lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await logAudit({
      userId: user.id,
      action: "login_locked",
      resource: "user",
      resourceId: user.id,
      detail: `Account locked until ${user.lockedUntil.toISOString()}`,
    });
    return null;
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const lockout = attempts >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_DURATION_MS)
      : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: lockout,
      },
    });

    await logAudit({
      userId: user.id,
      action: "login_failed",
      resource: "user",
      resourceId: user.id,
      detail: `Attempt ${attempts}/${MAX_FAILED_ATTEMPTS}${lockout ? " — account locked" : ""}`,
    });

    return null;
  }

  // Success — reset failed attempts
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  await logAudit({
    userId: user.id,
    action: "login_success",
    resource: "user",
    resourceId: user.id,
  });

  return user;
}
