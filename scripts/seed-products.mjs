import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getServiceAccount() {
  const encodedServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!encodedServiceAccount) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable. Encode the full Firebase service-account JSON file as base64.",
    );
  }

  try {
    const serviceAccount = JSON.parse(
      Buffer.from(encodedServiceAccount, "base64").toString("utf8"),
    );

    if (
      !serviceAccount ||
      typeof serviceAccount !== "object" ||
      typeof serviceAccount.project_id !== "string" ||
      typeof serviceAccount.client_email !== "string" ||
      typeof serviceAccount.private_key !== "string"
    ) {
      throw new Error(
        'Service account JSON must contain string "project_id", "client_email", and "private_key" fields.',
      );
    }

    return serviceAccount;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Invalid FIREBASE_SERVICE_ACCOUNT_BASE64 value: ${reason}`,
    );
  }
}

const response = await fetch("https://fakestoreapi.com/products");

if (!response.ok) {
  throw new Error(
    `Failed to fetch products: ${response.status} ${response.statusText}`,
  );
}

const products = await response.json();

if (!Array.isArray(products)) {
  throw new Error("Fake Store API returned an invalid products payload");
}

const adminApp =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: cert(getServiceAccount()),
      });

const adminDb = getFirestore(adminApp);
const batch = adminDb.batch();

for (const product of products) {
  if (typeof product.id !== "number") {
    throw new Error("Every seeded product must have a numeric id");
  }

  const { id, ...productData } = product;
  batch.set(adminDb.collection("products").doc(String(id)), productData);
}

await batch.commit();
console.log(`Seeded ${products.length} products into Firestore.`);
