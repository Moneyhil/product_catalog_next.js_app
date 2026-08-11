import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { adminDb } from "@/lib/firebase/admin";

export default async function PostSignInPage() {
  const user = await currentUser();

  if (user) {
    try {
      const documentRef = adminDb.collection("users").doc(user.id);
      const existingDoc = await documentRef.get();

      const primaryEmail = user.emailAddresses.find(
        (email) => email.id === user.primaryEmailAddressId,
      );
      const role = user.publicMetadata.role;

      await documentRef.set(
        {
          clerkId: user.id,
          email: primaryEmail?.emailAddress ?? null,
          firstName: user.firstName,
          lastName: user.lastName,
          role: typeof role === "string" ? role : "customer",
          createdAt: existingDoc.data()?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Failed to sync user during post-sign-in", error);
    }
  }

  redirect(user?.publicMetadata.role === "admin" ? "/admin" : "/");
}
