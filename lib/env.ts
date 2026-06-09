/** Validates required environment variables at import time.
 *  Imported by lib/db.ts and lib/auth.ts so failures surface early. */

function required(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

// Only validate at runtime, not during build/generate
const isBuild = !!process.env.NEXT_PHASE;

export const env = {
  DATABASE_URL: isBuild ? "" : required("DATABASE_URL"),
  NEXTAUTH_SECRET: isBuild ? "" : required("NEXTAUTH_SECRET"),
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
};
