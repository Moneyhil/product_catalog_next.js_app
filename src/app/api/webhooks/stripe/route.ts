import { NextRequest, NextResponse } from "next/server";
import type { Stripe } from "stripe";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import { getStripeClient } from "@/lib/stripe";
import type { Customer, Invoice, Order, OrderItem, OrderShipping } from "@/lib/types";
import { sendOrderConfirmation } from "@/lib/email";

type SettledSession = Stripe.Checkout.Session & {
  payment_intent: string | null;
  customer: string | null;
  customer_email: string | null;
  customer_details: {
    email: string | null;
    name: string | null;
    phone?: string | null;
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      country?: string | null;
    } | null;
  } | null;
  metadata:
    | {
        orderId?: string | null;
        clerkId?: string | null;
        guestEmail?: string | null;
      }
    | null;
  shipping_details?: {
    name?: string | null;
    phone?: string | null;
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      country?: string | null;
    } | null;
  } | null;
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

function generateInvoiceNumber(orderId: string): string {
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const suffix = orderId.slice(0, 8).toUpperCase();
  return `INV-${yyyy}${mm}-${suffix}`;
}

async function isWebhookAlreadyProcessed(eventId: string): Promise<boolean> {
  if (!eventId) return false;
  try {
    const docRef = adminDb.collection("webhook_events").doc(eventId);
    const existing = await docRef.get();
    if (existing.exists) {
      console.warn(
        `[stripe-webhook] Idempotency: skipping duplicate event ${eventId}`,
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error(
      `[stripe-webhook] Failed idempotency read-check for event ${eventId} — proceeding with fulfillment anyway`,
      error,
    );
    return false;
  }
}

async function markWebhookSuccessful(
  eventId: string,
  eventType: string,
): Promise<void> {
  if (!eventId) return;
  try {
    const docRef = adminDb.collection("webhook_events").doc(eventId);
    await docRef.set(
      {
        source: "stripe",
        type: eventType,
        processedAt: new Date().toISOString(),
      },
      { merge: false },
    );
  } catch (error) {
    console.error(
      `[stripe-webhook] Could not write webhook_events success marker for event ${eventId} — fulfillment succeeded but dedup marker missing; next Stripe retry will harmlessly short-circuit on existingOrder.status === paid`,
      error,
    );
  }
}

async function findOrderIdBySessionId(
  sessionId: string,
): Promise<{ orderId: string; clerkUserId: string | null } | null> {
  const orders = adminDb.collection("orders");
  const snapshot = await orders
    .where("stripeSessionId", "==", sessionId)
    .limit(1)
    .get();

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
    typeof sessionCustomerDetails?.email === "string"
      ? sessionCustomerDetails.email
      : typeof session.customer_email === "string"
      ? session.customer_email
      : null;
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
    (typeof shippingDetails?.name === "string" &&
      shippingDetails.name.length > 0) ||
    (typeof customerPhone === "string" && customerPhone.length > 0);

  const shipping: OrderShipping | null = hasShipping
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
    typeof session.metadata?.clerkId === "string"
      ? session.metadata.clerkId
      : null;
  if (!metadataClerkId) {
    throw new Error(
      `[stripe-webhook] session.metadata.clerkId is missing for session ${sessionId ?? "unknown"} (BUG: checkout requires authenticated Clerk user)`,
    );
  }

  const metadataOrderId =
    typeof session.metadata?.orderId === "string"
      ? session.metadata.orderId
      : null;
  const clientRefId =
    typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : null;

  const located = await findOrderIdBySessionId(sessionId);

  let resolvedOrderId: string | null =
    (located?.orderId ?? metadataOrderId ?? clientRefId) || null;

  if (resolvedOrderId) {
    try {
      const orderRef = adminDb.collection("orders").doc(resolvedOrderId);
      const orderSnap = await orderRef.get();
      let valid = true;
      if (!orderSnap.exists) {
        console.warn(
          `[stripe-webhook] session ${sessionId} resolved orderId=${resolvedOrderId} but orders/${resolvedOrderId} document does NOT exist in Firestore; treating as unresolved.`,
        );
        valid = false;
      } else {
        const doc = orderSnap.data() as Partial<Order>;
        const docClerkId =
          typeof doc.clerkId === "string" && doc.clerkId.length > 0
            ? doc.clerkId
            : null;
        if (docClerkId && docClerkId !== metadataClerkId) {
          console.warn(
            `[stripe-webhook] session ${sessionId} resolved orderId=${resolvedOrderId} but orders/${resolvedOrderId}.clerkId (${docClerkId}) does NOT match session.metadata.clerkId (${metadataClerkId}); dropping suspect spoof and treating as unresolved.`,
          );
          valid = false;
        }
      }
      if (!valid) resolvedOrderId = null;
    } catch (validateErr) {
      console.error(
        `[stripe-webhook] Could not validate order doc for session ${sessionId} orderId=${resolvedOrderId}; assuming valid to avoid no-op.`,
        validateErr,
      );
    }
  }

  const orderId = resolvedOrderId;
  if (!orderId) {
    console.warn(
      `checkout.session.completed received but no order found for stripeSessionId=${sessionId} (looked in: findOrderIdBySessionId, session.metadata.orderId=${metadataOrderId ?? "(none)"}, session.client_reference_id=${clientRefId ?? "(none)"}). THROWING so Stripe retries instead of silently skipping invoice generation. 🔥`,
    );
    throw new Error(
      `[stripe-webhook] FATAL: Could not resolve orderId for session ${sessionId}; session.metadata.orderId=${metadataOrderId ?? "(none)"}, client_reference_id=${clientRefId ?? "(none)"} — retry-pending`,
    );
  }

  if (metadataOrderId && metadataOrderId !== orderId) {
    console.warn(
      `Order id mismatch for session ${sessionId}: resolved=${orderId} session.metadata.orderId=${metadataOrderId}`,
    );
  }

  const clerkUserId = metadataClerkId;

  console.log(`[invoice] processing order: ${orderId}`);

  // Boxed in an object so TypeScript cannot incorrectly narrow the fields to
  // `never` when they are assigned from within the runTransaction() callback.
  const repairInvoiceCapture: { id: string | null; number: string | null } = {
    id: null,
    number: null,
  };

  await adminDb.runTransaction(async (transaction) => {
    const orderReference = adminDb.collection("orders").doc(orderId);
    const orderSnapshot = await transaction.get(orderReference);
    const existingOrder = orderSnapshot.exists
      ? ((await orderSnapshot.data()) as Partial<Order> | undefined)
      : undefined;

    const now = new Date().toISOString();
    const createdAt =
      typeof existingOrder?.createdAt === "string"
        ? existingOrder.createdAt
        : now;

    const orderItems: OrderItem[] = Array.isArray(existingOrder?.items)
      ? (existingOrder.items as OrderItem[])
      : [];
    const subtotalUsd =
      typeof existingOrder?.subtotalUsd === "number"
        ? existingOrder.subtotalUsd
        : orderItems.reduce(
            (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 0),
            0,
          );
    const orderTotal =
      typeof existingOrder?.totalUsd === "number"
        ? existingOrder.totalUsd
        : Math.max(subtotalUsd, amountPaidUsd);

    const finalClerkId = clerkUserId;

    const stampedInvoiceIdPresent =
      typeof existingOrder?.invoiceId === "string" &&
      existingOrder.invoiceId.length > 0;
    const stampedInvoiceNumberPresent =
      typeof existingOrder?.invoiceNumber === "string" &&
      existingOrder.invoiceNumber.length > 0;

    const hasStampedInvoiceDoc = stampedInvoiceIdPresent
      ? (
          await transaction.get(
            adminDb.collection("invoices").doc(existingOrder!.invoiceId!),
          )
        ).exists
      : false;

    let invoiceDocByOrderIdExists = false;
    if (!hasStampedInvoiceDoc) {
      const invoiceByOrderIdSnap = await transaction.get(
        adminDb
          .collection("invoices")
          .where("orderId", "==", orderId)
          .limit(1),
      );
      invoiceDocByOrderIdExists = !invoiceByOrderIdSnap.empty;
      if (invoiceDocByOrderIdExists && !stampedInvoiceIdPresent) {
        const strayDoc = invoiceByOrderIdSnap.docs[0]!;
        const strayData = strayDoc.data() as Partial<Invoice>;
        console.log(
          `[invoice] existing invoice found (by orderId search): ${strayDoc.id} — will reuse for order ${orderId} instead of creating duplicate.`,
        );
        repairInvoiceCapture.id = strayDoc.id;
        repairInvoiceCapture.number =
          typeof strayData.invoiceNumber === "string" &&
          strayData.invoiceNumber.length > 0
            ? strayData.invoiceNumber
            : generateInvoiceNumber(orderId);
      }
    }

    const orderIsAlreadyPaid = existingOrder?.status === "paid";
    const invoiceAlreadyExists =
      hasStampedInvoiceDoc || invoiceDocByOrderIdExists;

    if (orderIsAlreadyPaid && invoiceAlreadyExists) {
      if (!stampedInvoiceIdPresent) {
        const repairId = repairInvoiceCapture.id!;
        const repairNumber = repairInvoiceCapture.number!;
        transaction.set(
          orderReference,
          { invoiceId: repairId, invoiceNumber: repairNumber, updatedAt: now },
          { merge: true },
        );
        console.log(
          `[invoice] order ${orderId} paid + stray invoice doc ${repairId} existed, but order.invoiceId was missing — stamped it now. No new invoice created.`,
        );
      } else {
        console.log(
          `[invoice] existing invoice found: ${existingOrder!.invoiceId} — idempotent return for order ${orderId}. No changes.`,
        );
      }
      return;
    }

    const isRepairBranch = orderIsAlreadyPaid && !invoiceAlreadyExists;
    if (isRepairBranch) {
      console.log(
        `[invoice] creating invoice for order: ${orderId} (repair path — order already paid but invoice missing).`,
      );
    } else {
      console.log(
        `[invoice] creating invoice for order: ${orderId} (first-time payment path).`,
      );
    }

    const finalInvoiceId =
      (stampedInvoiceIdPresent ? existingOrder!.invoiceId! : null) ??
      repairInvoiceCapture.id ??
      adminDb.collection("invoices").doc().id;
    const finalInvoiceNumber =
      (stampedInvoiceNumberPresent ? existingOrder!.invoiceNumber! : null) ??
      repairInvoiceCapture.number ??
      generateInvoiceNumber(orderId);

    repairInvoiceCapture.id = finalInvoiceId;
    repairInvoiceCapture.number = finalInvoiceNumber;

    const finalNow = now;

    if (!orderIsAlreadyPaid) {
      const orderUpdate = {
        status: "paid" as const,
        clerkId: finalClerkId,
        email: (existingOrder?.email ?? customerEmail ?? null) as
          | string
          | null,
        phone:
          customerPhone ??
          ((existingOrder?.phone ?? null) as string | null),
        shipping: shipping ??
          ((existingOrder?.shipping ?? null) as Order["shipping"]),
        items: orderItems,
        subtotalUsd,
        totalUsd: orderTotal,
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
        updatedAt: finalNow,
      };

      transaction.set(orderReference, orderUpdate, { merge: true });

      const customerReference = adminDb
        .collection("customers")
        .doc(finalClerkId);
      const customerSnapshot = await transaction.get(customerReference);
      const existingCustomer = customerSnapshot.exists
        ? ((await customerSnapshot.data()) as Partial<Customer> | undefined)
        : undefined;

      if (
        existingCustomer &&
        typeof existingCustomer.totalOrders === "number"
      ) {
        const customerUpdate = {
          stripeCustomerId:
            stripeCustomerId ?? existingCustomer.stripeCustomerId ?? null,
          name: customerName ?? existingCustomer.name ?? null,
          email: customerEmail ?? existingCustomer.email ?? null,
          totalOrders: FieldValue.increment(1),
          totalSpent: FieldValue.increment(amountPaidUsd),
          updatedAt: finalNow,
        };

        transaction.set(customerReference, customerUpdate, { merge: true });
      } else {
        const createdCustomer: Customer & Record<string, unknown> = {
          clerkUserId: finalClerkId,
          stripeCustomerId,
          name: customerName,
          email: customerEmail,
          totalOrders: 1,
          totalSpent: amountPaidUsd,
          createdAt: existingCustomer?.createdAt ?? finalNow,
          updatedAt: finalNow,
        };
        transaction.set(customerReference, createdCustomer, {
          merge: true,
        });
      }

      const cartReference = adminDb.collection("carts").doc(finalClerkId);
      transaction.set(
        cartReference,
        {
          items: [],
          updatedAt: finalNow,
        },
        { merge: false },
      );
    }

    const invoice: Invoice & Record<string, unknown> = {
      id: finalInvoiceId,
      orderId,
      clerkId: finalClerkId,
      customerEmail,
      customerName,
      items: orderItems,
      subtotalUsd,
      totalUsd: orderTotal,
      amountPaidUsd,
      currency: "usd",
      status: "paid",
      shipping,
      stripePaymentIntentId: paymentIntentId,
      invoiceNumber: finalInvoiceNumber,
      issuedAt:
        (existingOrder &&
          typeof (existingOrder as Partial<Order & { paidAt?: string | null }>)
            .paidAt === "string" &&
          (existingOrder as Partial<Order & { paidAt?: string | null }>).paidAt!
            .length > 0
          ? (existingOrder as Partial<Order & { paidAt?: string | null }>)
              .paidAt!
          : null) ??
        existingOrder?.updatedAt ??
        finalNow,
      paidAt:
        (existingOrder &&
          typeof (existingOrder as Partial<Order & { paidAt?: string | null }>)
            .paidAt === "string" &&
          (existingOrder as Partial<Order & { paidAt?: string | null }>).paidAt!
            .length > 0
          ? (existingOrder as Partial<Order & { paidAt?: string | null }>)
              .paidAt!
          : null) ??
        existingOrder?.updatedAt ??
        finalNow,
      createdAt: existingOrder?.createdAt ?? finalNow,
      updatedAt: finalNow,
    };
    transaction.set(
      adminDb.collection("invoices").doc(finalInvoiceId),
      invoice,
      { merge: false },
    );
    console.log(`[invoice] invoice created: ${finalInvoiceId}`);

    transaction.set(
      orderReference,
      {
        invoiceId: finalInvoiceId,
        invoiceNumber: finalInvoiceNumber,
        updatedAt: finalNow,
      },
      { merge: true },
    );
  });

  console.log(`[invoice] transaction completed: ${orderId}`);

  void (async () => {
    try {
      const finalRepairInvoiceId: string | null = repairInvoiceCapture.id;
      const finalRepairInvoiceNumber: string | null = repairInvoiceCapture.number;
      const orderSnapshot = await adminDb
        .collection("orders")
        .doc(orderId)
        .get();
      const orderData = orderSnapshot.exists
        ? (orderSnapshot.data() as Partial<Order> | undefined)
        : undefined;

      if (orderData?.status !== "paid") {
        return;
      }

      const stampedInvoiceId =
        typeof orderData.invoiceId === "string" && orderData.invoiceId.length > 0
          ? orderData.invoiceId
          : typeof finalRepairInvoiceId === "string" &&
              finalRepairInvoiceId.length > 0
            ? finalRepairInvoiceId
            : null;
      const stampedInvoiceNumber =
        typeof orderData.invoiceNumber === "string" &&
        orderData.invoiceNumber.length > 0
          ? orderData.invoiceNumber
          : typeof finalRepairInvoiceNumber === "string" &&
              finalRepairInvoiceNumber.length > 0
            ? finalRepairInvoiceNumber
            : generateInvoiceNumber(orderId);
      const invoiceDocExists =
        stampedInvoiceId
          ? (await adminDb.collection("invoices").doc(stampedInvoiceId).get()).exists
          : false;
      if (!invoiceDocExists) {
        console.warn(
          `[stripe-webhook] Invoice doc invoices/${stampedInvoiceId ?? String(finalRepairInvoiceId)} does not exist for order ${orderId}; skipping notification writes on the invoice collection (would create a 3-field stub doc). Only writing notificationStatus to orders doc.`,
        );
      }

      const finalClerkId =
        (typeof orderData.clerkId === "string" && orderData.clerkId.length > 0
          ? orderData.clerkId
          : null) ?? clerkUserId;

      const orderItems: OrderItem[] = Array.isArray(orderData?.items)
        ? (orderData.items as OrderItem[])
        : [];
      const subtotalUsd =
        typeof orderData?.subtotalUsd === "number"
          ? orderData.subtotalUsd
          : orderItems.reduce(
              (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 0),
              0,
            );
      const orderTotal =
        typeof orderData?.totalUsd === "number" ? orderData.totalUsd : subtotalUsd;
      const finalAmountPaidUsd =
        typeof orderData?.amountPaidUsd === "number"
          ? orderData.amountPaidUsd
          : amountPaidUsd;
      const finalShipping =
        (orderData?.shipping as OrderShipping | undefined) ?? shipping ?? null;
      const finalCustomerEmail =
        typeof orderData?.customerEmail === "string"
          ? orderData.customerEmail
          : customerEmail ?? null;
      const finalCustomerName = customerName ?? null;
      const finalPaymentIntentId =
        typeof orderData?.stripePaymentIntentId === "string"
          ? orderData.stripePaymentIntentId
          : paymentIntentId;

      const fallbackInvoiceId = stampedInvoiceId ?? "unassigned-invoice-id";
      const invoiceForEmail: Invoice = {
        id: fallbackInvoiceId,
        orderId,
        clerkId: finalClerkId,
        customerEmail: finalCustomerEmail,
        customerName: finalCustomerName,
        items: orderItems,
        subtotalUsd,
        totalUsd: orderTotal,
        amountPaidUsd: finalAmountPaidUsd,
        currency: "usd",
        status: "paid",
        shipping: finalShipping,
        stripePaymentIntentId: finalPaymentIntentId,
        invoiceNumber: stampedInvoiceNumber,
        issuedAt: orderData?.updatedAt ?? new Date().toISOString(),
        paidAt: orderData?.updatedAt ?? new Date().toISOString(),
        createdAt: orderData?.createdAt ?? new Date().toISOString(),
        updatedAt: orderData?.updatedAt ?? new Date().toISOString(),
      };

      await sendOrderConfirmation(invoiceForEmail);

      const notificationSentAt = new Date().toISOString();
      await Promise.all([
        adminDb
          .collection("orders")
          .doc(orderId)
          .set(
            {
              notificationStatus: "sent",
              notificationSentAt,
              updatedAt: notificationSentAt,
            },
            { merge: true },
          ),
        invoiceDocExists
          ? adminDb
              .collection("invoices")
              .doc(stampedInvoiceId ?? fallbackInvoiceId)
              .set(
                {
                  notificationStatus: "sent",
                  notificationSentAt,
                  updatedAt: notificationSentAt,
                },
                { merge: true },
              )
          : Promise.resolve(),
      ]);
    } catch (emailError) {
      const finalRepairInvoiceId: string | null = repairInvoiceCapture.id;
      const finalRepairInvoiceNumber: string | null = repairInvoiceCapture.number;
      const message =
        emailError instanceof Error
          ? emailError.message
          : typeof emailError === "string"
          ? emailError
          : "Unknown notification error";

      console.error(
        `[stripe-webhook] Order confirmation email failed for invoice ${finalRepairInvoiceNumber ?? "(unknown)"} order ${orderId}`,
        emailError,
      );

      const notificationFailedAt = new Date().toISOString();
      const stampedInvoiceId =
        (await (async () => {
          try {
            const snap = await adminDb
              .collection("orders")
              .doc(orderId)
              .get();
            const d = snap.exists ? (snap.data() as Partial<Order>) : undefined;
            return typeof d?.invoiceId === "string" && d.invoiceId.length > 0
              ? d.invoiceId
              : finalRepairInvoiceId;
          } catch {
            return finalRepairInvoiceId;
          }
        })()) ?? null;
      const invoiceDocExists =
        stampedInvoiceId
          ? (await adminDb.collection("invoices").doc(stampedInvoiceId).get()).exists
          : false;
      try {
        await Promise.all([
          adminDb
            .collection("orders")
            .doc(orderId)
            .set(
              {
                notificationStatus: "failed",
                notificationFailedAt,
                notificationError: message,
                updatedAt: notificationFailedAt,
              },
              { merge: true },
            ),
          invoiceDocExists
            ? adminDb
                .collection("invoices")
                .doc(stampedInvoiceId!)
                .set(
                  {
                    notificationStatus: "failed",
                    notificationFailedAt,
                    notificationError: message,
                    updatedAt: notificationFailedAt,
                  },
                  { merge: true },
                )
            : Promise.resolve(),
        ]);
      } catch (writeError) {
        console.error(
          `[stripe-webhook] Could not persist notification failure state for order ${orderId} invoice ${String(finalRepairInvoiceId)}`,
          writeError,
        );
      }
    }
  })();
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

  const alreadyProcessed = await isWebhookAlreadyProcessed(event.id);
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, deduped: true });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await applyCheckoutSessionCompleted(
        event.data.object as SettledSession,
      );
    }

    await markWebhookSuccessful(event.id, event.type);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
        ? error
        : "Unknown webhook processing error";

    console.error(
      `Stripe webhook handler failed for event ${event.type} (id=${event.id}) — returning 500 so Stripe will retry`,
      error,
    );

    return NextResponse.json(
      {
        error: `Webhook processing failed: ${message}`,
        eventId: event.id,
        eventType: event.type,
        retryable: true,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
