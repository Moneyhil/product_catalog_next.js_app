import type { Invoice, OrderItem } from "./types";

type OrderConfirmationPayload = {
  to: string;
  subscriberId: string;
  orderId: string;
  invoiceNumber: string;
  orderUrl: string;
  invoiceUrl: string;
  customerName: string | null;
  customerEmail: string;
  totalUsd: number;
  currency: string;
  items: Array<{
    title: string;
    quantity: number;
    unitPriceUsd: number;
    image: string | null;
  }>;
  shipping: {
    name: string | null;
    phone: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  } | null;
  paidAt: string;
};

type NovuTriggerResponse = {
  acknowledged: boolean;
  transactionId?: string;
};

type NovuErrorResponse = {
  error: string;
  message: string;
};

function getAppUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (envUrl && envUrl.length > 0) return envUrl.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function buildAccountOrderUrl(orderId: string): string {
  return `${getAppUrl()}/account/orders/${encodeURIComponent(orderId)}`;
}

export function buildAccountInvoiceUrl(invoiceId: string): string {
  return `${getAppUrl()}/account/invoices/${encodeURIComponent(invoiceId)}`;
}

function mapOrderItems(
  items: OrderItem[],
): OrderConfirmationPayload["items"] {
  return items.map((item) => ({
    title: item.title,
    quantity: item.quantity,
    unitPriceUsd: item.price,
    image: typeof item.image === "string" && item.image.length > 0 ? item.image : null,
  }));
}

function flattenShipping(
  invoice: Pick<Invoice, "shipping">,
): OrderConfirmationPayload["shipping"] {
  const s = invoice.shipping;
  if (!s) return null;
  return {
    name: s.name ?? null,
    phone: s.phone ?? null,
    line1: s.address?.line1 ?? null,
    line2: s.address?.line2 ?? null,
    city: s.address?.city ?? null,
    state: s.address?.state ?? null,
    postalCode: s.address?.postalCode ?? null,
    country: s.address?.country ?? null,
  };
}

function subscriberIdFor(clerkUserId: string, email: string | null): string {
  if (clerkUserId && clerkUserId.length > 0) return clerkUserId;
  if (email && email.length > 0) return `email:${email.toLowerCase()}`;
  return "guest";
}

export async function sendOrderConfirmation(
  invoice: Invoice,
): Promise<NovuTriggerResponse | { skipped: boolean; reason: string }> {
  const apiKey = process.env.NOVU_API_KEY;
  const workflowId = process.env.NOVU_WORKFLOW_ID ?? "order-confirmation";

  if (!apiKey || apiKey.trim().length === 0) {
    console.warn(
      "[email] NOVU_API_KEY is not set; skipping order confirmation email.",
    );
    return {
      skipped: true,
      reason: "NOVU_API_KEY is not configured",
    };
  }

  const recipient = invoice.customerEmail;
  if (!recipient || recipient.length === 0) {
    console.warn(
      `[email] Order ${invoice.orderId} has no customer email; skipping email.`,
    );
    return {
      skipped: true,
      reason: "No customer email on invoice",
    };
  }

  const payload: OrderConfirmationPayload = {
    to: recipient,
    subscriberId: subscriberIdFor(invoice.clerkId, invoice.customerEmail),
    orderId: invoice.orderId,
    invoiceNumber: invoice.invoiceNumber,
    orderUrl: buildAccountOrderUrl(invoice.orderId),
    invoiceUrl: buildAccountInvoiceUrl(invoice.id),
    customerName: invoice.customerName,
    customerEmail: recipient,
    totalUsd: invoice.amountPaidUsd,
    currency: invoice.currency.toUpperCase(),
    items: mapOrderItems(invoice.items),
    shipping: flattenShipping(invoice),
    paidAt: invoice.paidAt,
  };

  try {
    const response = await fetch("https://api.novu.co/v1/events/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `ApiKey ${apiKey}`,
      },
      body: JSON.stringify({
        name: workflowId,
        to: {
          subscriberId: payload.subscriberId,
          email: recipient,
          firstName:
            payload.customerName?.split(" ")[0] ?? undefined,
          lastName:
            payload.customerName?.split(" ").slice(1).join(" ") ?? undefined,
        },
        payload,
      }),
    });

    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? ((await response.json()) as
          | NovuTriggerResponse
          | NovuErrorResponse
          | null)
      : null;

    if (!response.ok) {
      const message =
        data && typeof (data as NovuErrorResponse).message === "string"
          ? (data as NovuErrorResponse).message
          : `Novu returned HTTP ${response.status}`;
      throw new Error(message);
    }

    console.log(
      `[email] Order confirmation triggered for invoice ${invoice.invoiceNumber}: ` +
        JSON.stringify({
          acknowledged:
            data && typeof (data as NovuTriggerResponse).acknowledged === "boolean"
              ? (data as NovuTriggerResponse).acknowledged
              : true,
          transactionId:
            data &&
            typeof (data as NovuTriggerResponse).transactionId === "string"
              ? (data as NovuTriggerResponse).transactionId
              : undefined,
        }),
    );

    return {
      acknowledged:
        data && typeof (data as NovuTriggerResponse).acknowledged === "boolean"
          ? (data as NovuTriggerResponse).acknowledged
          : true,
      transactionId:
        data && typeof (data as NovuTriggerResponse).transactionId === "string"
          ? (data as NovuTriggerResponse).transactionId
          : undefined,
    };
  } catch (error) {
    console.error(
      `[email] Failed to send order confirmation for invoice ${invoice.invoiceNumber}`,
      error,
    );
    throw error;
  }
}
