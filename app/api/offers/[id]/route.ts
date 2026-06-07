import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  updateOffer,
  deleteOffer,
  updateOfferSchema,
  zodError,
} from "@/lib/api-utils";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// PUT /api/offers/[id]
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await props.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = updateOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodError(parsed.error), { status: 400 });
  }

  try {
    const result = await updateOffer(id, parsed.data);
    if (!result) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    }
    const userId = (session.user as { id?: string })?.id;
    await logAudit({ userId, action: "offer_updated", resource: "offer", resourceId: id });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to update offer." },
      { status: 500 },
    );
  }
}

// DELETE /api/offers/[id]
export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await props.params;

  try {
    const found = await deleteOffer(id);
    if (!found) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    }
    const userId = (session.user as { id?: string })?.id;
    await logAudit({ userId, action: "offer_deleted", resource: "offer", resourceId: id });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete offer." },
      { status: 500 },
    );
  }
}
