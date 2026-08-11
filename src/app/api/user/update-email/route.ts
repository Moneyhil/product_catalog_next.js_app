import { auth, clerkClient } from "@clerk/nextjs/server";

type UpdateEmailBody = {
  newEmail?: unknown;
};

export async function PATCH(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: UpdateEmailBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.newEmail !== "string" || !body.newEmail.includes("@")) {
    return Response.json({ error: "Invalid email address" }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    const userResponse = await client.users.getUser(userId);

    const existingPrimary = userResponse.emailAddresses.find(
      (email) => email.id === userResponse.primaryEmailAddressId,
    );

    if (existingPrimary?.emailAddress === body.newEmail) {
      return Response.json({ success: true, unchanged: true });
    }

    const created = await client.emailAddresses.createEmailAddress({
      userId,
      emailAddress: body.newEmail,
      verified: true,
    });

    await client.emailAddresses.updateEmailAddress({
      emailAddressId: created.id,
      primary: true,
    });

    if (existingPrimary?.id) {
      try {
        await client.emailAddresses.deleteEmailAddress({
          emailAddressId: existingPrimary.id,
        });
      } catch {
        console.warn("Could not remove old primary email");
      }
    }

    return Response.json({
      success: true,
      email: created.emailAddress,
      message: "Email updated in Clerk. Firestore will sync via webhook.",
    });
  } catch (error) {
    console.error("Failed to update email in Clerk", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Email update failed" },
      { status: 500 },
    );
  }
}
