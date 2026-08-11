import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";

function getFavoriteIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((id): id is number => typeof id === "number");
}

async function ensureUserDocument(userId: string) {
  const userReference = adminDb.collection("users").doc(userId);
  const existing = await userReference.get();

  if (existing.exists && existing.data()?.clerkId) {
    return;
  }

  try {
    const user = await currentUser();
    const client = await clerkClient();
    const fullUser = user ?? (await client.users.getUser(userId));

    const primaryEmail =
      "primaryEmailAddressId" in fullUser
        ? fullUser.emailAddresses?.find(
            (email) => email.id === (fullUser as { primaryEmailAddressId?: string }).primaryEmailAddressId,
          )
        : undefined;

    const firstName =
      "firstName" in fullUser ? (fullUser as { firstName?: string | null }).firstName :
      "first_name" in fullUser ? (fullUser as { first_name?: string | null }).first_name : null;
    const lastName =
      "lastName" in fullUser ? (fullUser as { lastName?: string | null }).lastName :
      "last_name" in fullUser ? (fullUser as { last_name?: string | null }).last_name : null;

    const publicMetadata =
      "publicMetadata" in fullUser ? (fullUser as { publicMetadata?: { role?: unknown } }).publicMetadata :
      "public_metadata" in fullUser ? (fullUser as { public_metadata?: { role?: unknown } }).public_metadata : {};

    const role = publicMetadata?.role;

    await userReference.set(
      {
        clerkId: userId,
        email:
          "emailAddress" in (primaryEmail ?? {})
            ? (primaryEmail as { emailAddress?: string }).emailAddress ?? null
            : "email_address" in (primaryEmail ?? {})
            ? (primaryEmail as { email_address?: string }).email_address ?? null
            : null,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        role: typeof role === "string" ? role : "customer",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch (error) {
    console.warn("Could not initialize user document in favorites endpoint", error);
  }
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userSnapshot = await adminDb.collection("users").doc(userId).get();
  return Response.json({
    favorites: getFavoriteIds(userSnapshot.data()?.favorites),
  });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { productId?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    !Number.isInteger(body.productId) ||
    (body.action !== "add" && body.action !== "remove")
  ) {
    return Response.json({ error: "Invalid favorite update" }, { status: 400 });
  }

  const userReference = adminDb.collection("users").doc(userId);
  await ensureUserDocument(userId);

  await userReference.set(
    {
      favorites:
        body.action === "add"
          ? FieldValue.arrayUnion(body.productId)
          : FieldValue.arrayRemove(body.productId),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  const userSnapshot = await userReference.get();
  return Response.json({
    favorites: getFavoriteIds(userSnapshot.data()?.favorites),
  });
}
