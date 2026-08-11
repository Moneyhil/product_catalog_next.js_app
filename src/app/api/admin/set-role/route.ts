import { auth, clerkClient } from "@clerk/nextjs/server";

type SetRoleBody = {
  targetClerkId?: unknown;
  newRole?: unknown;
};

export async function PATCH(request: Request) {
  const { userId, sessionClaims } = await auth();
  const metadata = sessionClaims?.metadata as { role?: unknown } | undefined;

  if (!userId || metadata?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: SetRoleBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.targetClerkId !== "string" ||
    (body.newRole !== "customer" && body.newRole !== "admin")
  ) {
    return Response.json({ error: "Invalid role update" }, { status: 400 });
  }

  await (await clerkClient()).users.updateUserMetadata(body.targetClerkId, {
    publicMetadata: { role: body.newRole },
  });

  return Response.json({ success: true });
}
