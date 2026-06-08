import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  readReps,
  createRep,
  createRepSchema,
  checkAliasConflict,
  zodError,
} from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const reps = await readReps(status);
    return NextResponse.json(reps);
  } catch {
    return NextResponse.json(
      { error: "Failed to read reps." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = createRepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodError(parsed.error), { status: 400 });
  }

  const conflict = await checkAliasConflict(parsed.data.aliases);
  if (conflict) {
    return NextResponse.json({ error: conflict }, { status: 409 });
  }

  try {
    const rep = await createRep(parsed.data);
    return NextResponse.json(rep, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create rep." },
      { status: 500 },
    );
  }
}
