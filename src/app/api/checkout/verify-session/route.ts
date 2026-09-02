import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { getStripeClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { userId } = await auth();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const sessionId =
    body && typeof body === "object" && "session_id" in body
      ? (body as { session_id?: unknown }).session_id
      : undefined;

  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json(
      { error: "session_id is required." },
      { status: 400 },
    );
  }

  let stripe;
  try {
    stripe = getStripeClient();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe is not configured.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    const sessionClerkId =
      (session.metadata && typeof session.metadata.clerkId === "string"
        ? session.metadata.clerkId
        : null) ?? null;

    if (userId && sessionClerkId && sessionClerkId !== userId) {
      return NextResponse.json(
        { error: "That session does not belong to you." },
        { status: 403 },
      );
    }

    const paymentStatus = session.payment_status;
    const status =
      session.status === "complete" && paymentStatus === "paid"
        ? "paid"
        : session.status === "open"
        ? "open"
        : session.status === "expired"
        ? "expired"
        : (session.status ?? "unknown");

    const paymentIntent =
      session.payment_intent &&
      typeof session.payment_intent === "object" &&
      session.payment_intent !== null &&
      "status" in session.payment_intent
        ? {
            id:
              typeof (session.payment_intent as { id?: unknown }).id ===
              "string"
                ? ((session.payment_intent as { id: string }).id as string)
                : null,
            status:
              typeof (session.payment_intent as { status?: unknown })
                .status === "string"
                ? ((session.payment_intent as { status: string })
                    .status as string)
                : null,
          }
        : null;

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      orderId:
        (session.client_reference_id as string | undefined) ??
        (session.metadata &&
        typeof session.metadata.orderId === "string"
          ? session.metadata.orderId
          : null) ??
        null,
      paymentStatus,
      status,
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? null,
      customerEmail:
        session.customer_details?.email ?? session.customer_email ?? null,
      paymentIntent,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to verify the session right now.";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
