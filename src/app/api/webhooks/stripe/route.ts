import { NextRequest, NextResponse } from "next/server";
import type { Stripe } from "stripe";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import { getStripeClient } from "@/lib/stripe";
import type { Customer, Order } from "@/lib/types";

export const config = {
  api: {
    bodyParser: false,
  },
};

type SettledSession = Stripe.Checkout.Session & {
  payment_intent: string | null;
  customer: string | null;
  customer_email: string | null;
  customer_details: {
    email: string | null;
    name: string | null;
  } | null;
  metadata:
    | {
        orderId?: string | null;
        clerkId?: string | null;
      }
    | null;
};

async function readRawBody(request: NextRequest): Promise<Buffer> {
  const reader = request.body?.getReader();
  if (!reader) {
    return Buffer.alloc(0);
  }

  const chunks: Uint8Array[] = [];
  while (true) {
    const read = await reader.read();
    if (read.done) break;
    chunks.push(read.value);
  }

  let byteLength = 0;
  for (const chunk of chunks) byteLength += chunk.length;
  const buffer = Buffer.alloc(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return buffer;
}

function asText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function findOrderIdBySessionId(
  sessionId: string,
): Promise<{ orderId: string; clerkUserId: string | null } | null> {
  const orders = adminDb.collection("orders");
  const snapshot = await orders.where("stripeSessionId", "==", sessionId).limit(1).get();

  if (!snapshot.empty) {
    const document = snapshot.docs[0]!;
    const data = document.data() as Partial<Order>;
    return {
      orderId: document.id,
      clerkUserId: asText(data.clerkId) ?? null,
    };
  }

  const fallbackDoc = await orders.doc(sessionId).get();
  if (fallbackDoc.exists) {
    const data = fallbackDoc.data() as Partial<Order>;
    if (asText(data.stripeSessionId) === sessionId) {
      return {
        orderId: fallbackDoc.id,
        clerkUserId: asText(data.clerkId) ?? null,
      };
    }
  }

  return null;
}

async function applyCheckoutSessionCompleted(
  session: SettledSession,
): Promise<void> {
  const sessionId = typeof session.id === "string" ? session.id : null;
  if (!sessionId) {
    console.warn("checkout.session.completed received without session.id");
    return;
  }

  const sessionCustomerDetails = session.customer_details;
  const amountTotalMinor = asNumber(session.amount_total) ?? 0;
  const amountPaidUsd = amountTotalMinor / 100;

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : null;
  const customerEmail =
    (typeof sessionCustomerDetails?.email === "string"
      ? sessionCustomerDetails.email
      : null) ??
    (typeof session.customer_email === "string" ? session.customer_email : null);
  const customerName =
    typeof sessionCustomerDetails?.name === "string"
      ? sessionCustomerDetails.name
      : null;
  const customerPhone =
    typeof sessionCustomerDetails?.phone === "string"
      ? sessionCustomerDetails.phone
      : null;

  const shippingDetails = session.shipping_details;
  const shippingAddressSource =
    shippingDetails?.address ?? sessionCustomerDetails?.address ?? null;

  const shippingAddress = shippingAddressSource
    ? {
        line1:
          typeof shippingAddressSource.line1 === "string"
            ? shippingAddressSource.line1
            : null,
        line2:
          typeof shippingAddressSource.line2 === "string"
            ? shippingAddressSource.line2
            : null,
        city:
          typeof shippingAddressSource.city === "string"
            ? shippingAddressSource.city
            : null,
        state:
          typeof shippingAddressSource.state === "string"
            ? shippingAddressSource.state
            : null,
        postalCode:
          typeof shippingAddressSource.postal_code === "string"
            ? shippingAddressSource.postal_code
            : null,
        country:
          typeof shippingAddressSource.country === "string"
            ? shippingAddressSource.country
            : null,
      }
    : null;

  const hasShipping =
    !!shippingAddress ||
    (typeof shippingDetails?.name === "string" && shippingDetails.name.length > 0) ||
    (typeof customerPhone === "string" && customerPhone.length > 0);

  const shipping = hasShipping
    ? {
        name:
          typeof shippingDetails?.name === "string"
            ? shippingDetails.name
            : customerName ?? null,
        phone: customerPhone ?? null,
        address: shippingAddress ?? {
          line1: null,
          line2: null,
          city: null,
          state: null,
          postalCode: null,
          country: null,
        },
      }
    : null;

  const metadataClerkId =
    typeof session.metadata?.clerkId === "string" ? session.metadata.clerkId : null;
  const metadataOrderId =
    typeof session.metadata?.orderId === "string" ? session.metadata.orderId : null;

  const located = await findOrderIdBySessionId(sessionId);
  const orderId = (located?.orderId ?? metadataOrderId) || null;

  if (!orderId) {
    console.warn(
      `checkout.session.completed received but no order found for stripeSessionId=${sessionId}`,
    );
    return;
  }

  if (metadataOrderId && metadataOrderId !== orderId) {
    console.warn(
      `Order id mismatch for session ${sessionId}: resolved=${orderId} session.metadata.orderId=${metadataOrderId}`,
    );
  }

  const clerkUserId =
    located?.clerkUserId ?? metadataClerkId ?? null;

  await adminDb.runTransaction(async (transaction) => {
    const orderReference = adminDb.collection("orders").doc(orderId);
    const orderSnapshot = await transaction.get(orderReference);
    const existingOrder = orderSnapshot.exists
      ? (orderSnapshot.data() as Partial<Order> | undefined)
      : undefined;

    const customerReference = clerkUserId
      ? adminDb.collection("customers").doc(clerkUserId)
      : null;
    const customerSnapshot = customerReference
      ? await transaction.get(customerReference)
      : null;
    const existingCustomer =
      customerSnapshot && customerSnapshot.exists
        ? (customerSnapshot.data() as Partial<Customer> | undefined)
        : undefined;

    if (existingOrder?.status === "paid") {
      return;
    }

    const now = new Date().toISOString();
    const createdAt =
      typeof existingOrder?.createdAt === "string"
        ? existingOrder.createdAt
        : now;

    const orderUpdate = {
      status: "paid" as const,
      clerkId: clerkUserId ?? existingOrder?.clerkId ?? "",
      email: (existingOrder?.email ?? null) as string | null,
      phone: customerPhone ?? (existingOrder?.phone ?? null) as string | null,
      shipping: shipping ?? (existingOrder?.shipping ?? null) as Order["shipping"],
      items: (existingOrder?.items ?? []) as unknown as Order["items"],
      subtotalUsd: (existingOrder?.subtotalUsd ?? 0) as number,
      totalUsd: (existingOrder?.totalUsd ?? amountPaidUsd) as number,
      currency: (existingOrder?.currency ?? "usd") as Order["currency"],
      stripeSessionId: (existingOrder?.stripeSessionId ?? sessionId) as
        | string
        | undefined,
      stripePaymentIntentId: paymentIntentId
        ? paymentIntentId
        : (undefined as string | undefined),
      customerEmail: customerEmail ?? (undefined as string | undefined),
      amountPaidUsd,
      createdAt,
      updatedAt: now,
    };

    transaction.set(orderReference, orderUpdate, { merge: true });

    if (clerkUserId && customerReference) {
      if (existingCustomer && typeof existingCustomer.totalOrders === "number") {
        const customerUpdate = {
          stripeCustomerId: stripeCustomerId ?? existingCustomer.stripeCustomerId ?? null,
          name: customerName ?? existingCustomer.name ?? null,
          email: customerEmail ?? existingCustomer.email ?? null,
          totalOrders: FieldValue.increment(1),
          totalSpent: FieldValue.increment(amountPaidUsd),
          updatedAt: now,
        };

        transaction.set(customerReference, customerUpdate, { merge: true });
      } else {
        const createdCustomer: Customer & Record<string, unknown> = {
          clerkUserId,
          stripeCustomerId,
          name: customerName,
          email: customerEmail,
          totalOrders: 1,
          totalSpent: amountPaidUsd,
          createdAt: existingCustomer?.createdAt ?? now,
          updatedAt: now,
        };
        transaction.set(customerReference, createdCustomer, { merge: true });
      }

      const cartReference = adminDb.collection("carts").doc(clerkUserId);
      transaction.set(
        cartReference,
        {
          items: [],
          updatedAt: now,
        },
        { merge: false },
      );
    }
  });
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Stripe webhook secret is not configured" },
      { status: 500 },
    );
  }

  const signatureHeader = request.headers.get("stripe-signature");
  if (!signatureHeader) {
    return NextResponse.json(
      { error: "Missing Stripe-Signature header" },
      { status: 400 },
    );
  }

  let rawPayload: Buffer;
  try {
    rawPayload = await readRawBody(request);
  } catch (error) {
    console.error("Failed to read Stripe webhook body", error);
    return NextResponse.json(
      { error: "Unable to read request body" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(
      rawPayload.toString("utf8"),
      signatureHeader,
      webhookSecret,
    ) as Stripe.Event;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error(`Stripe webhook signature verification failed: ${reason}`);
    return NextResponse.json(
      { error: `Invalid Stripe signature: ${reason}` },
      { status: 400 },
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      await applyCheckoutSessionCompleted(event.data.object as SettledSession);
    }
  } catch (error) {
    console.error(
      `Stripe webhook handler failed for event ${event.type} (id=${event.id})`,
      error,
    );
  }

  return NextResponse.json({ received: true });
}
