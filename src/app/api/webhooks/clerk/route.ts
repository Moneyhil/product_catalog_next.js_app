import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";

import { adminDb } from "@/lib/firebase/admin";

type UserData = {
  clerkId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  updatedAt: string;
  createdAt?: string;
};

function extractUserData(
  data: WebhookEvent["data"] & {
    id: string;
    email_addresses: Array<{ id: string; email_address: string }>;
    primary_email_address_id?: string;
    first_name?: string | null;
    last_name?: string | null;
    public_metadata?: { role?: unknown };
  },
): UserData {
  const primaryEmail = data.email_addresses.find(
    (email) => email.id === data.primary_email_address_id,
  );
  const role = data.public_metadata?.role;

  return {
    clerkId: data.id,
    email: primaryEmail?.email_address ?? null,
    firstName: data.first_name ?? null,
    lastName: data.last_name ?? null,
    role: typeof role === "string" ? role : "customer",
    updatedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  console.log("STEP 0: webhook route hit");

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return new Response("Webhook secret is not configured", { status: 500 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  const payload = await request.text();
  let event: WebhookEvent;

  try {
    event = new Webhook(webhookSecret).verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  console.log("STEP 1: signature verified, event type =", event.type);

  switch (event.type) {
    case "user.created": {
      let role = event.data.public_metadata.role;

      if (typeof role !== "string") {
        role = "customer";
        try {
          console.log("STEP 2: calling clerkClient to set default role");
          const client = await clerkClient();
          await client.users.updateUserMetadata(event.data.id, {
            publicMetadata: { role: "customer" },
          });
          console.log("STEP 3: clerkClient metadata update done");
        } catch (error) {
          console.error("Failed to set default role in Clerk metadata", error);
        }
      }

      const userData = extractUserData(event.data as Parameters<typeof extractUserData>[0]);
      const documentRef = adminDb.collection("users").doc(event.data.id);
      const existingDoc = await documentRef.get();

      console.log("STEP 4: about to write to Firestore", event.data.id);

      await documentRef.set(
        {
          ...userData,
          role: role as string,
          createdAt: existingDoc.data()?.createdAt ?? new Date().toISOString(),
        },
        { merge: true },
      );

      console.log("STEP 5: Firestore write done for user.created");
      break;
    }

    case "user.updated": {
      console.log("STEP 4: about to write to Firestore (user.updated)", event.data.id);

      const userData = extractUserData(event.data as Parameters<typeof extractUserData>[0]);
      const documentRef = adminDb.collection("users").doc(event.data.id);
      const existingDoc = await documentRef.get();

      await documentRef.set(
        {
          ...userData,
          createdAt: existingDoc.data()?.createdAt ?? new Date().toISOString(),
        },
        { merge: true },
      );

      console.log("STEP 5: Firestore write done for user.updated");
      break;
    }

    case "user.deleted": {
      const { id } = event.data;

      if (!id) {
        console.warn("user.deleted event received without an id");
        break;
      }

      console.log("STEP 4: about to delete from Firestore", id);
      await adminDb.collection("users").doc(id).delete();
      console.log("STEP 5: Firestore delete done");
      break;
    }
  }

  console.log("STEP 6: returning success response");
  return Response.json({ success: true });
}