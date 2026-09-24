import type Stripe from "stripe";

import { adminDb } from "@/lib/firebase/admin";
import { formatStripeAmount, getStripeClient } from "@/lib/stripe";
import type { CartItem, Order, OrderItem } from "@/lib/types";

function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    Number.isInteger(candidate.id) &&
    typeof candidate.title === "string" &&
    typeof candidate.price === "number" &&
    candidate.price >= 0 &&
    typeof candidate.image === "string" &&
    Number.isInteger(candidate.quantity) &&
    (candidate.quantity as number) >= 1
  );
}

function validateCart(value: unknown): OrderItem[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<number>();
  const items: OrderItem[] = [];

  for (const entry of value) {
    if (!isValidCartItem(entry)) continue;
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    items.push(entry);
  }

  return items;
}

function computeTotals(items: OrderItem[]) {
  const subtotalUsd = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  return {
    subtotalUsd,
    totalUsd: subtotalUsd,
  };
}

function buildLineItems(items: OrderItem[]): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: "usd",
      unit_amount: formatStripeAmount(item.price),
      product_data: {
        name: item.title,
        images: item.image ? [item.image] : undefined,
        metadata: {
          productId: String(item.id),
        },
      },
    },
  }));
}

export async function POST(request: Request) {
  let body: {
    items?: unknown;
    cancelUrl?: unknown;
    successUrlBase?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const items = validateCart(body.items);
  if (items.length === 0) {
    return Response.json(
      { error: "Your cart is empty." },
      { status: 400 },
    );
  }

  const orderId = adminDb.collection("orders").doc().id;
  const totals = computeTotals(items);

  let draftOrder: Order | null = null;
  try {
    const now = new Date().toISOString();
    draftOrder = {
      id: orderId,
      items,
      subtotalUsd: totals.subtotalUsd,
      totalUsd: totals.totalUsd,
      currency: "usd",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };

    await adminDb
      .collection("orders")
      .doc(orderId)
      .create(draftOrder as unknown as FirebaseFirestore.DocumentData);
  } catch (error) {
    console.error("Failed to create draft order", error);
    return Response.json(
      { error: "Failed to create your order. Please try again." },
      { status: 500 },
    );
  }

  let stripe: Stripe;
  try {
    stripe = getStripeClient();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Missing Stripe configuration.";
    console.error("Stripe client could not be initialized", error);
    return Response.json({ error: message }, { status: 500 });
  }

  const requestUrl = new URL(request.url);
  const defaultBase = `${requestUrl.protocol}//${requestUrl.host}`;
  const base =
    typeof body.successUrlBase === "string" && body.successUrlBase
      ? body.successUrlBase
      : defaultBase;

  const successUrl = new URL(`${base}/order/success`);
  successUrl.searchParams.set("order_id", orderId);
  const successUrlString = `${successUrl.toString()}&session_id={CHECKOUT_SESSION_ID}`;

  const cancelUrl =
    typeof body.cancelUrl === "string" && body.cancelUrl
      ? body.cancelUrl
      : `${base}/cart`;

  let session: Stripe.Checkout.Session;
  try {
    const metadata: Record<string, string> = {
      orderId,
    };

    session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "usd",
      ui_mode: "hosted",
      payment_method_types: ["card"],
      client_reference_id: orderId,
      metadata,
      shipping_address_collection: {
        allowed_countries: ["PK"],
      },
      phone_number_collection: {
        enabled: true,
      },
      line_items: buildLineItems(items),
      success_url: successUrlString,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      automatic_tax: { enabled: false },
    });
  } catch (error) {
    console.error("Failed to create Stripe Checkout Session", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create checkout session.",
      },
      { status: 500 },
    );
  }

  if (!session.url) {
    try {
      await adminDb
        .collection("orders")
        .doc(orderId)
        .set(
          {
            status: "failed",
            updatedAt: new Date().toISOString(),
          } as unknown as FirebaseFirestore.PartialWithFieldValue<FirebaseFirestore.DocumentData>,
          { merge: true },
        );
    } catch (updateError) {
      console.error(
        "Could not mark order as failed after Stripe returned no URL",
        updateError,
      );
    }
    return Response.json(
      { error: "Stripe did not return a checkout URL." },
      { status: 500 },
    );
  }

  try {
    await adminDb
      .collection("orders")
      .doc(orderId)
      .set(
        {
          status: "pending",
          stripeSessionId: session.id,
          updatedAt: new Date().toISOString(),
        } as unknown as FirebaseFirestore.PartialWithFieldValue<FirebaseFirestore.DocumentData>,
        { merge: true },
      );
  } catch (error) {
    console.error(
      "Created Stripe Checkout Session but could not update order",
      error,
    );
    return Response.json(
      {
        error:
          "Checkout was created, but we could not update your order. Please contact support.",
        orderId,
        sessionUrl: session.url,
      },
      { status: 500 },
    );
  }

  return Response.json({
    orderId,
    sessionUrl: session.url,
  });
}
