import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/users — list all users (manager only)
export async function GET() {
  const me = await getSessionUser();
  if (!me || me.role !== "manager") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ users });
}

// POST /api/users — create a new user (manager only)
export async function POST(request: Request) {
  const me = await getSessionUser();
  if (!me || me.role !== "manager") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  let body: { name?: string; email?: string; password?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { name, email, password, role } = body;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const validRoles = ["manager", "user"];
  const userRole = validRoles.includes(role ?? "") ? role! : "user";

  // Check for duplicate email
  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hash,
      role: userRole,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  await logAudit({
    userId: me.id,
    action: "user_created",
    resource: "user",
    resourceId: user.id,
    detail: `Created ${userRole}: ${user.email}`,
  });

  return NextResponse.json({ user }, { status: 201 });
}
