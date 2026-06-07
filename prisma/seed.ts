import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME;

  if (!email || !password || !name) {
    console.error("Required: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME env vars.");
    console.error("Example: ADMIN_EMAIL=you@company.com ADMIN_PASSWORD=securepass123 ADMIN_NAME='Your Name' npx tsx prisma/seed.ts");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, password: hash },
  });

  console.log(`Seeded admin user: ${user.email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
