import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  readOffers,
  createOffer,
  createOfferSchema,
  zodError,
} from "@/lib/api-utils";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/offers
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const offers = await readOffers();
    return NextResponse.json(offers);
  } catch {
    return NextResponse.json(
      { error: "Failed to read offers." },
      { status: 500 },
    );
  }
}

// POST /api/offers
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

  const parsed = createOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodError(parsed.error), { status: 400 });
  }

  try {
    const offer = await createOffer(parsed.data);
    const userId = (session.user as { id?: string })?.id;
    await logAudit({ userId, action: "offer_created", resource: "offer", resourceId: offer.id, detail: offer.name });
    return NextResponse.json(offer, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create offer." },
      { status: 500 },
    );
  }
}
