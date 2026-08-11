import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";

import { adminDb } from "@/lib/firebase/admin";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await currentUser();
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const primaryEmail = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId,
    );
    const role = user.publicMetadata.role;
    const documentRef = adminDb.collection("users").doc(userId);
    const existingDoc = await documentRef.get();

    await documentRef.set(
      {
        clerkId: userId,
        email: primaryEmail?.emailAddress ?? null,
        firstName: user.firstName,
        lastName: user.lastName,
        role: typeof role === "string" ? role : "customer",
        createdAt: existingDoc.data()?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to sync user to Firestore", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 },
    );
  }
}
