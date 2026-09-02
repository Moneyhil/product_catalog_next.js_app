/* eslint-disable */
/*
 * scripts/reconcile-missing-invoices.cjs
 *
 * ONE-TIME idempotent reconciliation script.
 *
 * Purpose:
 *   For every paid order in Firestore that is MISSING its invoice document
 *   (or missing the invoiceId/invoiceNumber stamp), create the missing invoice
 *   and stamp the order. This repairs historical orders affected by the
 *   idempotency-guard bug in the Stripe webhook.
 *
 * Safety properties (DO NOT remove any of these):
 *   1. DRY_RUN=true by default — prints a plan but WRITES NO DOCUMENTS.
 *      Only actually writes when you explicitly set DRY_RUN=false.
 *   2. Idempotent: if order.invoiceId is set AND invoices/{id} exists, skip.
 *      If an invoice already exists by orderId search (stray doc), reuse it
 *      and only stamp the missing fields on the order — never duplicate.
 *   3. Does NOT call Novu, does NOT send email, does NOT increment
 *      customer totals, does NOT clear carts, does NOT change
 *      order.status, does NOT touch Stripe.
 *   4. Reads env vars IN-PROCESS from Next.js's own loaded .env.local via
 *      dotenv (never copies env to disk — only process.env access).
 *   5. All invoice creation + order stamping happen inside a single Firestore
 *      transaction — atomic.
 *
 * Usage:
 *   Plan only (no writes):
 *     node scripts/reconcile-missing-invoices.cjs
 *   Apply writes:
 *     DRY_RUN=false node scripts/reconcile-missing-invoices.cjs
 *   Target a single order id (for the newest broken order, for example):
 *     ONLY_ORDER_ID=hTuZDaUfN3ZlAzt0bRGT DRY_RUN=false node scripts/reconcile-missing-invoices.cjs
 */

const fs = require("fs");
const path = require("path");

// Load .env.local directly into process.env (memory only; no secrets copied
// to disk beyond the existing .env.local that Next.js itself ships).
(function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
})();

const { cert, getApps, initializeApp, getApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const DRY_RUN = process.env.DRY_RUN !== "false"; // default: true (safe)
const ONLY_ORDER_ID =
  typeof process.env.ONLY_ORDER_ID === "string" &&
  process.env.ONLY_ORDER_ID.length > 0
    ? process.env.ONLY_ORDER_ID
    : null;

function getServiceAccount() {
  const encodedServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!encodedServiceAccount) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_BASE64 in .env.local (loaded by dotenv).",
    );
  }
  const parsed = JSON.parse(
    Buffer.from(encodedServiceAccount, "base64").toString("utf8"),
  );
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof parsed.project_id !== "string"
  ) {
    throw new Error("Invalid decoded service-account JSON.");
  }
  return parsed;
}

const sa = getServiceAccount();
const app = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert(sa),
      projectId: sa.project_id,
    });
const db = getFirestore(app);

function generateInvoiceNumber(orderId) {
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const suffix = String(orderId).slice(0, 8).toUpperCase();
  return `INV-${yyyy}${mm}-${suffix}`;
}

function asText(v) {
  return typeof v === "string" ? v : null;
}

async function reconcileOne(orderId) {
  const orderRef = db.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    return { orderId, skipped: true, reason: "order doc does not exist" };
  }
  const order = orderSnap.data();
  if (!order || order.status !== "paid") {
    return { orderId, skipped: true, reason: `status !== paid (${JSON.stringify(order?.status)})` };
  }

  const clerkId = asText(order.clerkId);
  if (!clerkId) {
    return { orderId, skipped: true, reason: "missing order.clerkId" };
  }

  const stampedInvoiceId = asText(order.invoiceId);
  const stampedInvoiceNumber = asText(order.invoiceNumber);

  let stampedDocExists = false;
  if (stampedInvoiceId) {
    const s = await db.collection("invoices").doc(stampedInvoiceId).get();
    stampedDocExists = s.exists;
  }

  let strayByOrderId = null;
  if (!stampedDocExists) {
    const snap = await db
      .collection("invoices")
      .where("orderId", "==", orderId)
      .limit(1)
      .get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      const d = doc.data();
      strayByOrderId = {
        id: doc.id,
        invoiceNumber: asText(d?.invoiceNumber),
      };
    }
  }

  if (stampedDocExists && stampedInvoiceId && stampedInvoiceNumber) {
    return { orderId, skipped: true, reason: `already fully reconciled (invoice ${stampedInvoiceId} present + stamped)` };
  }

  // Decide the invoice ID / number we want (reuse whatever already exists).
  let targetInvoiceId = stampedDocExists
    ? stampedInvoiceId!
    : strayByOrderId
      ? strayByOrderId.id
      : db.collection("invoices").doc().id;
  let targetInvoiceNumber = stampedDocExists
    ? stampedInvoiceNumber!
    : strayByOrderId?.invoiceNumber ||
      stampedInvoiceNumber ||
      generateInvoiceNumber(orderId);

  const needsOrderStamp =
    stampedInvoiceId !== targetInvoiceId ||
    stampedInvoiceNumber !== targetInvoiceNumber;
  const needsInvoiceWrite = !(stampedDocExists || strayByOrderId);

  if (!needsInvoiceWrite && !needsOrderStamp) {
    return { orderId, skipped: true, reason: "no-op: already consistent" };
  }

  const action = needsInvoiceWrite
    ? `CREATE invoices/${targetInvoiceId} + stamp order.invoiceId=${targetInvoiceId}`
    : `STAMP ONLY order.invoiceId=${targetInvoiceId} (invoice doc already exists as ${strayByOrderId ? `invoices/${strayByOrderId.id}` : `invoices/${stampedInvoiceId}`})`;

  if (DRY_RUN) {
    return { orderId, plan: action, dryRun: true, needsInvoiceWrite, needsOrderStamp };
  }

  // ---- ACTUAL WRITE PATH (DRY_RUN=false) ----
  const result = await db.runTransaction(async (tx) => {
    const oSnap = await tx.get(orderRef);
    if (!oSnap.exists) return { ok: false, reason: "order vanished mid-tx" };
    const ord = oSnap.data();
    if (!ord || ord.status !== "paid") {
      return { ok: false, reason: "order not paid mid-tx" };
    }

    // Re-read inside transaction to avoid TOCTOU with concurrent webhook.
    const tStamped = asText(ord.invoiceId) &&
      (await tx.get(db.collection("invoices").doc(asText(ord.invoiceId)!))).exists;
    if (tStamped) {
      return { ok: true, skippedInTx: true, reason: "stamped+exists by concurrent writer mid-tx" };
    }
    const tStraySnap = await tx.get(
      db.collection("invoices").where("orderId", "==", orderId).limit(1),
    );
    if (!tStamped && !tStraySnap.empty) {
      const s = tStraySnap.docs[0];
      const d = s.data();
      targetInvoiceId = s.id;
      targetInvoiceNumber =
        asText(ord.invoiceNumber) ||
        asText(d?.invoiceNumber) ||
        targetInvoiceNumber;
    }

    const now = new Date().toISOString();
    const items = Array.isArray(ord.items) ? ord.items : [];
    const subtotalUsd =
      typeof ord.subtotalUsd === "number"
        ? ord.subtotalUsd
        : items.reduce(
            (sum, it) =>
              sum +
              (typeof it?.price === "number" ? it.price : 0) *
                (typeof it?.quantity === "number" ? it.quantity : 0),
            0,
          );
    const totalUsd =
      typeof ord.totalUsd === "number"
        ? ord.totalUsd
        : typeof ord.amountPaidUsd === "number"
          ? ord.amountPaidUsd
          : subtotalUsd;
    const amountPaidUsd =
      typeof ord.amountPaidUsd === "number"
        ? ord.amountPaidUsd
        : totalUsd;

    const stampedAlready = asText(ord.invoiceId) && asText(ord.invoiceId) === targetInvoiceId;
    const invoiceDocAlreadyPresent = tStamped || !tStraySnap.empty;

    if (!invoiceDocAlreadyPresent) {
      const invoice = {
        id: targetInvoiceId,
        orderId,
        clerkId,
        customerEmail: asText(ord.customerEmail) || asText(ord.email) || null,
        customerName: asText(ord.shipping?.name) || null,
        items,
        subtotalUsd,
        totalUsd,
        amountPaidUsd,
        currency: "usd",
        status: "paid",
        shipping: ord.shipping || null,
        stripePaymentIntentId: asText(ord.stripePaymentIntentId) || null,
        invoiceNumber: targetInvoiceNumber,
        issuedAt: asText(ord.paidAt) || asText(ord.updatedAt) || asText(ord.createdAt) || now,
        paidAt: asText(ord.paidAt) || asText(ord.updatedAt) || asText(ord.createdAt) || now,
        createdAt: asText(ord.createdAt) || now,
        updatedAt: now,
      };
      tx.set(db.collection("invoices").doc(targetInvoiceId), invoice, {
        merge: false,
      });
    }

    if (!stampedAlready || asText(ord.invoiceNumber) !== targetInvoiceNumber) {
      tx.set(
        orderRef,
        {
          invoiceId: targetInvoiceId,
          invoiceNumber: targetInvoiceNumber,
          updatedAt: now,
        },
        { merge: true },
      );
    }

    return {
      ok: true,
      invoiceId: targetInvoiceId,
      invoiceNumber: targetInvoiceNumber,
      invoiceCreated: !invoiceDocAlreadyPresent,
      orderStamped: !stampedAlready,
    };
  });

  return { orderId, applied: true, ...result };
}

async function main() {
  console.log(
    `reconcile-missing-invoices  project=${sa.project_id}  DRY_RUN=${DRY_RUN}${ONLY_ORDER_ID ? `  ONLY_ORDER_ID=${ONLY_ORDER_ID}` : ""}`,
  );
  console.log("");

  let orderIds = [];
  if (ONLY_ORDER_ID) {
    orderIds = [ONLY_ORDER_ID];
  } else {
    // No composite-index required: read broad + filter client-side.
    const snap = await db.collection("orders").limit(1000).get();
    snap.forEach((doc) => {
      const d = doc.data();
      if (d && d.status === "paid") orderIds.push(doc.id);
    });
    orderIds.sort();
  }

  const stats = { total: orderIds.length, skipped: 0, planned: 0, applied: 0, failures: 0 };
  const planLines = [];
  const results = [];

  for (const id of orderIds) {
    try {
      const r = await reconcileOne(id);
      results.push(r);
      if (r.skipped) stats.skipped++;
      else if (r.dryRun) {
        stats.planned++;
        planLines.push(`  - order/${id}: ${r.plan}`);
      } else if (r.applied) stats.applied++;
      else stats.failures++;
    } catch (e) {
      stats.failures++;
      results.push({ orderId: id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  console.log(
    `Summary: total=${stats.total} skipped=${stats.skipped} planned=${stats.planned} applied=${stats.applied} failures=${stats.failures}`,
  );
  console.log("");
  if (planLines.length) {
    console.log(
      DRY_RUN
        ? `DRY_RUN=true — these changes WILL BE MADE if you re-run with DRY_RUN=false:`
        : `Applied these changes (DRY_RUN=false):`,
    );
    console.log(planLines.join("\n"));
    console.log("");
  }
  for (const r of results) {
    if (r.error || r.applied || r.plan) console.log(JSON.stringify(r));
  }
  if (DRY_RUN && stats.planned > 0) {
    console.log("");
    console.log(
      "To apply this plan for real, re-run with: DRY_RUN=false node scripts/reconcile-missing-invoices.cjs",
    );
    if (!ONLY_ORDER_ID) {
      console.log(
        "To apply only for the newest broken order first:  ONLY_ORDER_ID=<orderId> DRY_RUN=false node scripts/reconcile-missing-invoices.cjs",
      );
    }
  }
  process.exit(stats.failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
