import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  updateRep,
  deleteRep,
  updateRepSchema,
  checkAliasConflict,
  zodError,
} from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = updateRepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodError(parsed.error), { status: 400 });
  }

  if (parsed.data.aliases) {
    const conflict = await checkAliasConflict(parsed.data.aliases, id);
    if (conflict) {
      return NextResponse.json({ error: conflict }, { status: 409 });
    }
  }

  try {
    const rep = await updateRep(id, parsed.data);
    if (!rep) {
      return NextResponse.json({ error: "Rep not found." }, { status: 404 });
    }
    return NextResponse.json(rep);
  } catch {
    return NextResponse.json(
      { error: "Failed to update rep." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const deleted = await deleteRep(id);
    if (!deleted) {
      return NextResponse.json({ error: "Rep not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete rep." },
      { status: 500 },
    );
  }
}
