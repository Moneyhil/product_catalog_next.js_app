import { cert, getApp, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

type FirebaseServiceAccountJson = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function getServiceAccount(): FirebaseServiceAccountJson {
  const encodedServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!encodedServiceAccount) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable. Encode the full Firebase service-account JSON file as base64.",
    );
  }

  try {
    const serviceAccount: unknown = JSON.parse(
      Buffer.from(encodedServiceAccount, "base64").toString("utf8"),
    );

    if (
      !serviceAccount ||
      typeof serviceAccount !== "object" ||
      typeof (serviceAccount as FirebaseServiceAccountJson).project_id !== "string" ||
      typeof (serviceAccount as FirebaseServiceAccountJson).client_email !== "string" ||
      typeof (serviceAccount as FirebaseServiceAccountJson).private_key !== "string"
    ) {
      throw new Error(
        'Service account JSON must contain string "project_id", "client_email", and "private_key" fields.',
      );
    }

    return serviceAccount as FirebaseServiceAccountJson;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Invalid FIREBASE_SERVICE_ACCOUNT_BASE64 value: ${reason}`,
    );
  }
}

const app = getApps().length
  ? getApp()
  : initializeApp({
      // The Admin SDK accepts Firebase's snake_case JSON service-account fields.
      credential: cert(getServiceAccount() as unknown as ServiceAccount),
    });

export const adminDb = getFirestore(app);
