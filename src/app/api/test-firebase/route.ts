import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  try {
    const snapshot = await adminDb.collection("users").limit(1).get();

    return Response.json({
      success: true,
      message: "Firebase Admin connection is working",
      documents: snapshot.size,
    });
  } catch (error) {
    console.error("FIREBASE TEST ERROR:", error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}