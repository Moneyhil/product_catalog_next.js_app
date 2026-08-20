import { auth } from "@clerk/nextjs/server";
import { adminDb } from "@/lib/firebase/admin";
import type { CartItem } from "@/lib/types";

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

function validateCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<number>();
  const items: CartItem[] = [];

  for (const entry of value) {
    if (!isValidCartItem(entry)) continue;
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    items.push(entry);
  }

  return items;
}

type CartDocument = {
  items: CartItem[];
  updatedAt: string;
};

function toCartDocument(items: CartItem[]): CartDocument {
  return {
    items,
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cartSnapshot = await adminDb.collection("carts").doc(userId).get();
  const data = cartSnapshot.data() as { items?: unknown } | undefined;
  return Response.json({
    items: validateCart(data?.items),
  });
}

export async function PUT(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { items?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const items = validateCart(body.items);

  const document = toCartDocument(items);
  const cartReference = adminDb.collection("carts").doc(userId);
  await cartReference.set(document, { merge: false });

  return Response.json({ items: document.items });
}
