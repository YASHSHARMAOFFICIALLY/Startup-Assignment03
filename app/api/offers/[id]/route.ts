import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/session";
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
  const me = await getSessionUser();
  if (!me || me.role !== "manager") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
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
    await logAudit({ userId: me.id, action: "offer_updated", resource: "offer", resourceId: id });
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
  const me = await getSessionUser();
  if (!me || me.role !== "manager") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const { id } = await props.params;

  try {
    const found = await deleteOffer(id);
    if (!found) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    }
    await logAudit({ userId: me.id, action: "offer_deleted", resource: "offer", resourceId: id });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete offer." },
      { status: 500 },
    );
  }
}
