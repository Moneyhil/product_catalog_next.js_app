# Product Catalog

A responsive product catalog web app built with Next.js (App Router, Webpack) and Tailwind CSS, consuming the [Fake Store API](https://fakestoreapi.com/). Built as part of a React.js & Next.js internship task, extended with Clerk authentication, Firestore-backed user store with bidirectional sync, role-based access, and per-user favorites.

## Features

- 🏠 Home page displaying all products in a responsive grid
- 🔍 Search products by title (case-insensitive, live filtering)
- 🗂️ Filter products by category
- ↕️ Sort products by price or rating
- 📄 Paginated product browsing (page size selector + pagination controls)
- 📄 Dynamic product details page (`/products/[id]`)
- ❤️ Add/remove products from Favorites (persisted per-user in **Firestore**)
- 👤 User profile management page
- ⏳ Loading and error states for data fetching
- 🚫 Custom 404 page for invalid product routes
- 📱 Fully responsive UI (mobile, tablet, desktop)
- 🔐 User authentication (sign-in / sign-up) via **Clerk**
- 🔄 **Bidirectional Clerk ⇄ Firestore user sync**
  - Webhook on `user.created` / `user.updated` / `user.deleted` → Firestore
  - Post-sign-in fallback sync (resilient to missed webhooks)
  - Favorites endpoint auto-creates full user doc if missing
  - Email update API updates Clerk (source of truth) → webhook → Firestore
- 🏷️ Default user role assignment (`customer`) written back to Clerk's public metadata on sign-up
- 🔑 Role-based access control:
  - **Admin page** (`/admin`): view all users + change their role
  - **Customer**: browse products + manage favorites
- 🛒 **Shopping Cart** (persistent per-user Firestore `carts/{clerkId}` + localStorage guest scaffolding; checkouts now require authenticated Clerk users)
- 💳 **Stripe Hosted Checkout** → draft order in Firestore → atomic fulfillment via `checkout.session.completed` webhook
- 📦 **Per-user Order history** (`/account/orders` → `/account/orders/[orderId]`) with bidirectional PKR price display, status badges, draft-filtered listing
- 🧾 **Invoices** generated atomically for every paid order:
  - `/account/invoices` list page (paid invoices only, newest first)
  - `/account/invoices/[invoiceId]` detail page with itemized PDF-style view + shipping block
  - Order success page "View Invoice" CTA (deep-links to the specific invoice once stamped; falls back to list while generating)
- 📧 **Novu order-confirmation email** trigger (void post-transaction, non-blocking, failure-state persisted to order + invoice docs)
- 🔧 **One-time reconciliation script** for paid orders missing invoices (idempotent; DRY_RUN=true by default; customer-safe: no totals re-incremented, no cart re-cleared, no email re-sent)

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Webpack)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Product API:** [Fake Store API](https://fakestoreapi.com/products)
- **Authentication:** [Clerk](https://clerk.com/) (`@clerk/nextjs`)
- **Payments:** [Stripe](https://stripe.com/docs/api) (Hosted Checkout Sessions; `stripe` SDK, `checkout.session.completed` webhook)
- **Email:** [Novu](https://novu.co/) (order-confirmation workflow trigger; non-blocking void post-transaction)
- **Database:** [Firebase Firestore](https://firebase.google.com/docs/firestore) via `firebase-admin` (server-side writes) and `firebase` client SDK
- **Webhook Security:** Svix (Clerk webhook signature verification) + raw-body Stripe signature verification
- **State Management:** React Context API (for Favorites + Shopping Cart state)

## Project Structure

```
product-catalog/
├── src/
│   ├── proxy.ts                     # Clerk middleware: publicRoutes + webhook carveout
│   ├── app/
│   │   ├── layout.tsx               # Root layout: ClerkProvider + CartProvider + FavoritesProvider + ToastProvider + conditional-customer Navbar
│   │   ├── page.tsx                 # Home page — products grid with search/filter/grid
│   │   ├── globals.css
│   │   ├── loading.tsx              # Global loading state
│   │   ├── error.tsx                # Global error boundary
│   │   ├── not-found.tsx            # Custom 404 page
│   │   ├── cart/
│   │   │   └── page.tsx             # Cart page — sign-up redirect + auto_checkout=1 auth-return flow
│   │   ├── order/
│   │   │   └── success/
│   │   │       ├── page.tsx         # Order success — "Order Confirmed" + View Invoice CTA
│   │   │       └── order-success-client.tsx
│   │   ├── admin/
│   │   │   └── page.tsx             # Admin user management (role change)
│   │   ├── favorites/
│   │   │   └── page.tsx             # User's saved favorites list
│   │   ├── post-sign-in/
│   │   │   └── page.tsx             # Fallback Firestore sync + customer-aware redirect
│   │   ├── profile/
│   │   │   └── [[...profile]]/
│   │   │       └── page.tsx         # Clerk <UserProfile /> hosted page
│   │   ├── sign-in/
│   │   │   └── [[...sign-in]]/
│   │   │       └── page.tsx         # Clerk hosted sign-in — forceRedirectUrl allowlist
│   │   ├── sign-up/
│   │   │   └── [[...sign-up]]/
│   │   │       └── page.tsx         # Clerk hosted sign-up
│   │   ├── products/
│   │   │   └── [id]/
│   │   │       ├── page.tsx         # Dynamic product details page
│   │   │       ├── loading.tsx
│   │   │       └── error.tsx
│   │   ├── account/
│   │   │   ├── layout.tsx           # Customer dashboard shell + sidebar (Orders/Invoices/Profile/Settings)
│   │   │   ├── page.tsx             # → permanentRedirect("/account/orders")
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx         # Order history list
│   │   │   │   └── [orderId]/
│   │   │   │       └── page.tsx     # Order detail view
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx         # Invoice list (by clerkId + status=paid + issuedAt desc)
│   │   │   │   └── [invoiceId]/
│   │   │   │       └── page.tsx     # Invoice detail view
│   │   │   ├── favorites/
│   │   │   │   └── page.tsx         # Favorites link in account sidebar
│   │   │   ├── profile/
│   │   │   │   └── page.tsx         # Profile (link to Clerk profile hosted page)
│   │   │   └── settings/
│   │   │       └── page.tsx         # Settings page
│   │   └── api/
│   │       ├── admin/
│   │       │   └── set-role/
│   │       │       └── route.ts     # PATCH — change user role (admin only)
│   │       ├── cart/
│   │       │   └── route.ts         # GET + PUT — per-user carts/{clerkId}
│   │       ├── checkout/
│   │       │   ├── route.ts         # POST — auth(401 if missing) → draft order → Stripe Session
│   │       │   └── verify-session/
│   │       │       └── route.ts     # POST — session retrieve + order status+invoiceId
│   │       ├── favorites/
│   │       │   └── route.ts         # GET + PATCH — per-user favorites
│   │       ├── test-firebase/
│   │       │   └── route.ts         # GET — quick Firebase Admin health check
│   │       ├── user/
│   │       │   ├── sync/
│   │       │   │   └── route.ts     # POST — on-demand Clerk → Firestore sync
│   │       │   └── update-email/
│   │       │       └── route.ts     # PATCH — update email in Clerk (triggers webhook)
│   │       └── webhooks/
│   │           ├── clerk/
│   │           │   └── route.ts     # Clerk Svix webhook: user.created/updated/deleted
│   │           └── stripe/
│   │               └── route.ts      # Stripe raw-body webhook → atomic fulfillment + invoice create
│   │
│   ├── components/
│   │   ├── Navbar.jsx               # Conditional "Order History" link when customer doc exists
│   │   ├── ProductGrid.tsx          # Search + filter + grid (pagination/sort removed — flat grid)
│   │   ├── ProductCard.tsx
│   │   ├── SearchBar.tsx
│   │   ├── CategoryFilter.tsx
│   │   ├── FavoriteButton.tsx
│   │   ├── AddToCartButton.tsx
│   │   ├── Toast.tsx                # ToastProvider + useToast
│   │   ├── RoleSelect.tsx
│   │   ├── RatingStars.jsx
│   │   ├── Pagination.jsx           # (UNUSED — kept for future)
│   │   └── SortDropdown.jsx         # (UNUSED — kept for future)
│   │
│   ├── context/
│   │   ├── CartContext.tsx          # CartProvider — localStorage guest + Firestore signed-in + merge-on-sign-in
│   │   └── FavoritesContext.tsx     # Favorites state + Firestore API wrapper
│   │
│   ├── hooks/
│   │   ├── useCart.ts
│   │   └── useFavorites.ts
│   │
│   └── lib/
│       ├── api.ts                   # Fake Store API fetch functions
│       ├── types.ts                 # Shared TS types: Product/Rating/User/Customer/CartItem/Order/Invoice
│       ├── currency.ts              # formatUSD / formatPKR (centralized 83× multiplier)
│       ├── constants.ts             # App-wide constants
│       ├── stripe.ts                # Shared stripe SDK (apiVersion 2024-06-20)
│       ├── email.ts                 # Novu order-confirmation trigger + payload builder
│       └── firebase/
│           ├── admin.ts             # Firebase Admin SDK (adminDb) — reads FIREBASE_SERVICE_ACCOUNT_BASE64
│           └── client.ts            # Firebase client SDK — experimentalForceLongPolling + ignoreUndefined
│
├── scripts/
│   ├── seed-products.mjs             # (Optional) one-time seed: fakestoreapi → products collection
│   └── reconcile-missing-invoices.cjs # (Optional) ONE-TIME idempotent repair: paid orders with no invoice doc
│
├── ngrok/
│   └── ngrok.exe                     # Local tunnel for webhook dev (Clerk + Stripe)
│
├── public/
├── next.config.ts
├── postcss.config.mjs                # Tailwind v4 PostCSS plugin (tailwind.config no longer needed in v4)
├── eslint.config.mjs
├── tsconfig.json
├── firestore.rules                   # Firestore security rules (client-read gatekeeper)
├── package.json
└── README.md
```

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- npm (comes bundled with Node.js)
- A [Clerk](https://clerk.com/) account and application
- A [Firebase](https://firebase.google.com/) project with Firestore enabled, and a service account key

### Installation

1. Clone the repository
```bash
   git clone <your-repo-url>
   cd product-catalog
```

2. Install dependencies
```bash
   npm install
```

3. Configure environment variables (see [Environment Variables](#environment-variables) below)

4. Run the development server
```bash
   npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

> 💡 **For local webhook testing with Clerk:**
> Clerk cannot POST webhooks to `localhost`. Use ngrok or a similar tunnel:
> ```bash
>   ngrok/ngrok.exe http 3000
> ```
> Then set the tunnel URL + `/api/webhooks/clerk` as the webhook endpoint in the Clerk Dashboard, and update `CLERK_WEBHOOK_SECRET`.
> For Stripe's local webhook, use the `stripe` CLI for fastest loop (prints your whsec_ secret in its startup output).

## Environment Variables

Create a `.env.local` file in the project root with the following:

```bash
# --- Clerk ---
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/post-sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/post-sign-in
CLERK_WEBHOOK_SECRET=

# --- Firebase client SDK ---
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# --- Firebase Admin SDK (server-only) ---
# Full service-account JSON, base64-encoded
FIREBASE_SERVICE_ACCOUNT_BASE64=

# --- Stripe (server-only scope when deploying to Vercel) ---
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# --- Novu (order confirmation emails; server-only) ---
NOVU_API_KEY=                       # leave empty during dev; emails are skipped, status persisted on order/invoice
NOVU_WORKFLOW_ID=order-confirmation
```

> ⚠️ `CLERK_WEBHOOK_SECRET` is the signing secret from your Clerk Dashboard's webhook endpoint config (used to verify incoming `svix` webhook signatures). `FIREBASE_SERVICE_ACCOUNT_BASE64` is generated by base64-encoding the full JSON key downloaded from **Firebase Console → Project Settings → Service Accounts → Generate new private key**. `STRIPE_WEBHOOK_SECRET` is the `whsec_…` secret from Stripe Dashboard → Webhooks (hosted) or the `stripe listen` CLI output (local). `NOVU_API_KEY` can be left empty during local development: the `sendOrderConfirmation` call in `src/lib/email.ts` gracefully skips the Novu trigger when the key is empty and persists `notificationStatus: "failed"` on the order + invoice documents for retry.

## Local Webhook Tunnels

Neither Clerk nor Stripe can POST webhooks directly to `localhost`. Use ngrok (or the Stripe CLI) for local testing:

```bash
# Expose the whole Next app on a public HTTPS URL (covers BOTH webhooks):
ngrok/ngrok.exe http 3000
```

Then set **two** endpoints:

| Provider | Dashboard endpoint URL | Events to subscribe | Signing secret env var |
|---|---|---|---|
| Clerk | `https://<id>.ngrok-free.app/api/webhooks/clerk` | `user.created`, `user.updated`, `user.deleted` | `CLERK_WEBHOOK_SECRET` |
| Stripe | `https://<id>.ngrok-free.app/api/webhooks/stripe` | `checkout.session.completed` | `STRIPE_WEBHOOK_SECRET` |

**Faster for Stripe-only** (no ngrok required for Stripe webhook dev):

```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe --events checkout.session.completed
```

The CLI prints its local `STRIPE_WEBHOOK_SECRET=whsec_…` in the first few lines of output; paste that into `.env.local`.

## Authentication & Bidirectional User Sync

### Sync Flow
```
User signs up / signs in
        ↓
Clerk creates/updates user account
        ↓
Clerk Svix webhook → POST /api/webhooks/clerk
        ↓
Signature verified with CLERK_WEBHOOK_SECRET
        ↓
Firebase Admin writes users/{clerkUserId}
  (clerkId, email, firstName, lastName, role, createdAt, updatedAt)
```

### Resilience Layers
| Layer | Where | Purpose |
|-------|-------|---------|
| **Primary: Clerk webhook** | `user.created` / `user.updated` / `user.deleted` → `/api/webhooks/clerk` | Real-time sync of every Clerk change |
| **Fallback: Post-sign-in** | `/post-sign-in` runs on every login | Catches users if webhook was missed (ngrok down, etc.) |
| **Favorites guard** | `ensureUserDocument()` in `/api/favorites` | If a user's first action is favoriting before webhook fires, builds the full doc from Clerk API |
| **On-demand repair** | `POST /api/user/sync` | Manual sync trigger (for "Repair sync" UI buttons) |

### Firestore User Document (`users/{clerkUserId}`)
```ts
{
  clerkId:    string;           // Same as document ID
  email:      string | null;    // Primary email (from Clerk)
  firstName:  string | null;
  lastName:   string | null;
  role:       "customer" | "admin";
  favorites:  number[];         // Product IDs
  createdAt:  ISO8601 string;   // Set once, never overwritten
  updatedAt:  ISO8601 string;   // Updated on every write
}
```

### Delete Sync
When a user is deleted from the Clerk Dashboard, the `user.deleted` webhook automatically deletes the matching Firestore document and all its data (including favorites).

### Email Change Sync
To keep Clerk as the single source of truth, email changes go through Clerk first:
1. App calls `PATCH /api/user/update-email { newEmail }`
2. Route creates a new verified primary email in Clerk
3. Clerk fires `user.updated` webhook
4. Webhook syncs the new email to Firestore

## Internal API Reference

All routes below are Next.js Route Handlers.

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/webhooks/clerk` | POST | Svix sig | Clerk user event receiver → Firestore sync (`user.created`/`updated`/`deleted`) |
| `/api/webhooks/stripe` | POST | Stripe sig | `checkout.session.completed` → atomic fulfillment: mark paid + customer upsert + cart clear + **invoice create + order stamp** |
| `/api/favorites` | GET | ✅ User | Get current user's favorite product IDs |
| `/api/favorites` | PATCH | ✅ User | Add/remove favorite (`{ productId, action: "add"\|"remove" }`) |
| `/api/cart` | GET + PUT | ✅ User | Firestore `carts/{clerkId}` get + replace; owner-gated by Clerk `auth()` userId |
| `/api/checkout` | POST | ✅ User **(401 if missing)** | Cart non-empty → draft order → Stripe Hosted Checkout Session → `{ orderId, sessionUrl }` |
| `/api/checkout/verify-session` | POST | ✅ User | `stripe.checkout.sessions.retrieve(id)` with `payment_intent` expand; returns `{ paymentStatus, orderId, customerEmail, invoiceId, invoiceNumber, status }` |
| `/api/admin/set-role` | PATCH | ✅ Admin | Change a user's role (`{ targetClerkId, newRole: "admin"\|"customer" }`) |
| `/api/user/sync` | POST | ✅ User | Force re-sync current user from Clerk → Firestore |
| `/api/user/update-email` | PATCH | ✅ User | Update email in Clerk (triggers webhook → Firestore) |
| `/api/test-firebase` | GET | — | Health check: verifies Firebase Admin connectivity |

## Stripe Checkout & Webhook — Full Fulfillment Contract

```
User at /cart (signed in)
   clicks Checkout
      ↓
POST /api/checkout (auth() userId required — 401 otherwise)
   validates cart non-empty
   creates draft orders/{orderId} { status:"draft", items, clerkId, total, createdAt }
   creates Stripe Checkout Session (hosted, PK only, shipping PK, phone collection, success_url with {CHECKOUT_SESSION_ID} literal placeholder)
   sets order.status = "pending" + stripeSessionId + metadata.orderId + metadata.clerkId + client_reference_id = orderId
   returns { orderId, sessionUrl }
      ↓
Redirect to Stripe → payment succeeds
      ↓
Stripe fires checkout.session.completed → POST /api/webhooks/stripe
   readRawBody → stripe.webhooks.constructEvent
   isWebhookAlreadyProcessed(evtId)? return 200 dedup
   applyCheckoutSessionCompleted(session):
      (1) resolve orderId: findOrderIdBySessionId(sessionId) ?? metadata.orderId ?? client_reference_id
      (2) validate order doc exists AND order.clerkId === session.metadata.clerkId (anti-spoof)
      (3) adminDb.runTransaction → THREE BRANCHES (idempotent at every level):
          Branch A: NOT paid → (a) write status=paid + persist customer/shipping/amount, (b) upsert customers/{clerkId} totals increment, (c) clear carts/{clerkId}, (d) build invoice doc + write invoices/{id}, (e) stamp orders/{orderId}.invoiceId
          Branch B: PAID AND (stamped invoice doc exists OR stray invoice where orderId==orderId found) → if stamp missing on order, stamp now; else no-op; RETURN
          Branch C: PAID BUT invoice MISSING → repair invoice NOW (skip customer totals increment, skip cart clear, skip paid-status flip, only write invoice + stamp order)
      (4) markWebhookSuccessful(evtId) → webhook_events/{evtId} written ONLY AFTER success
   void post-tx: sendOrderConfirmation (Novu) + write notificationStatus sent/failed to order + (if base doc exists) invoice
      ↓
/order/success → "Order Confirmed" + View Invoice CTA
   order.invoiceId set? → /account/invoices/${invoiceId}
   invoice not yet stamped? → /account/invoices list fallback
   order-success-client polls verify-session every 2s until paid
```

### Firestore collections written during checkout/fulfillment

| Collection | Writes during checkout | Writes during fulfillment | Notes |
|---|---|---|---|
| `orders/{orderId}` | ✅ draft then pending | ✅ paid + invoiceId | idempotency-safe (merge:true + `existingOrder.status==paid` guard refined) |
| `customers/{clerkId}` | — | ✅ upsert; first order → totalOrders=1 + totalSpent=amountPaidUsd; returning → FieldValue.increment() | Only on Branch A (NOT paid); skipped on repair Branch C |
| `carts/{clerkId}` | — | ✅ items=[] via merge:false | Only on Branch A; skipped during repair |
| `invoices/{invoiceId}` | — | ✅ doc create | Always on Branch A + Branch C; skipped on Branch B |
| `webhook_events/{eventId}` | — | ✅ marker AFTER all success | dedup read first before any DB ops |

### Invoice document shape (`invoices/{id}`)

Written with `merge:false` — either the full doc exists or it never half-exists on crash.

Fields are the union of what the invoice list page reads and what the detail page reads. `clerkId`, `status: "paid"`, and `issuedAt` are always populated so the listing query `where(clerkId) + where(status=="paid") + orderBy(issuedAt desc)` **never silently drops invoices** (Firestore's `orderBy` excludes docs missing the orderBy field).

```ts
{
  id: string,
  orderId: string,
  clerkId: string,                    // matches the listing query
  invoiceNumber: string,              // INV-YYYYMM-orderId[:8]
  status: "paid",                     // matches the listing query
  issuedAt: ISO8601 string,           // matches orderBy(issuedAt desc)
  paidAt: ISO8601 string,
  createdAt: ISO8601 string,
  updatedAt: ISO8601 string,
  customerEmail: string | null,
  customerName: string | null,
  items: OrderItem[],                 // { id, title, image, price, quantity }
  subtotalUsd: number,
  totalUsd: number,
  amountPaidUsd: number,
  currency: "usd",
  shipping: { name, phone, address } | null,
  stripePaymentIntentId: string | null,
  notificationStatus?: "sent" | "failed",  // written void post-tx
  notificationSentAt?: ISO8601,
  notificationError?: string,
  notificationFailedAt?: ISO8601
}
```

#### Invoice listing query (matches writes above)

From `/account/invoices/page.tsx`:
```ts
adminDb.collection("invoices")
  .where("clerkId", "==", clerkUserId)
  .where("status", "==", "paid")
  .orderBy("issuedAt", "desc")
```

**Required Firestore composite index** (deploy via `firebase deploy --only firestore:indexes` after writing `firestore.indexes.json`):

```json
{
  "indexes": [
    {
      "collectionGroup": "invoices",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clerkId", "order": "ASCENDING" },
        { "fieldPath": "status",  "order": "ASCENDING" },
        { "fieldPath": "issuedAt","order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clerkId",   "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Orders list page avoids `status not-in` (causes composite index explosion) by using a simpler `where(clerkId) + orderBy(createdAt desc)` and filtering `status !== "draft"` client-side.

## Key Implementation Notes

- **Server vs Client Components:** Pages fetch product data on the server (async Server Components). Interactive elements — search, filtering, favoriting, role selection, cart steppers, success-page polling — are Client Components (`"use client"`).
- **Favorites persistence:** Per-user `favorites: number[]` array stored directly on each Firestore user document (not `localStorage`). Written server-side via the Admin SDK; read back via `FavoritesContext` which wraps `/api/favorites`.
- **Shopping Cart persistence:** Guests use `localStorage["cart"]`. Signed-in users write to `carts/{clerkId}` via `/api/cart` (owner-gated by Clerk `auth().userId`). Merge-on-sign-in sums matching product quantities; localStorage is cleared after sync.
- **Checkout is strictly auth-gated BEFORE Stripe runs:** `POST /api/checkout` enforces `auth().userId` (returns 401 if missing). The cart page redirects signed-out clicks via `/sign-up?redirect_url=/cart%3Fauto_checkout%3D1`, so the signed-in return page auto-runs checkout without requiring a second button press. **Guest (unauthenticated) checkout has been completely removed.**
- **Idempotency defense-in-depth (Stripe webhook), outer → inner:**
  1. `isWebhookAlreadyProcessed(eventId)` reads `webhook_events/{eventId}` FIRST — returns 200 deduped.
  2. orderId resolves via 3 fallbacks; if all null, throws (HTTP 500) so Stripe retries.
  3. Inside `runTransaction` callback: if (paid AND (stamped invoice exists OR stray invoice by orderId found)) → early return. **Does NOT skip if paid but invoice genuinely missing — repairs by writing invoice + stamp.**
  4. Invoice ID/number reuse chain: `existingOrder.invoiceId` first → stray-by-orderId → new `doc().id`. Same invoice number for same order forever.
  5. Invoice write uses `{ merge: false }` (no half-docs; commit-or-nothing for the full payload); order stamp uses `{ merge: true }`.
- **`issuedAt` is guaranteed on every invoice written by the webhook:** default priority chain `existingOrder.paidAt ?? existingOrder.updatedAt ?? now` — so the listing `orderBy(issuedAt, desc)` never silently drops new invoices (Firestore excludes docs missing the orderBy field).
- **No 3-field 'stub' invoice docs from post-tx notifications:** the void post-tx block writes `notificationStatus` to the `invoices` collection **only when** `invoiceDocExists` (reads the base doc first). If base doc is missing, it writes only to `orders/{orderId}.notificationStatus` — no stub pollution.
- **Firestore transport timeout fix in browsers:** `initializeFirestore(app, { experimentalForceLongPolling: true, ignoreUndefinedProperties: true })` in `src/lib/firebase/client.ts` — WebChannel timeouts ("Backend didn't respond within 10 seconds") eliminated for users on restrictive networks.
- **Type safety:** Product data, Customer, CartItem, Order, OrderStatus, and Invoice all share interfaces in `src/lib/types.ts`. User-facing APIs validate inputs with `typeof` / shape guards.
- **Source of truth:** Always **Clerk** for identity, email, role, and name. Firestore users/customers are synchronized copies. Never mutate email or role directly in Firestore — go through Clerk APIs first.
- **Novu emails are non-blocking:** `sendOrderConfirmation` runs in a `void (async () => { try {...} catch {...} })()` block after the transaction commits. Failures persist `notificationStatus: "failed"` + `notificationError` on the order + (if base doc exists) invoice for later manual retry; never fail the payment success 200 back to Stripe.
- **`createdAt` immutability:** Every write path reads an existing `createdAt` first and only sets it if absent, so original timestamps are preserved forever (orders, customers, users, invoices).
- **Public routes** (see `src/proxy.ts`): `/`, `/products(.*)`, `/cart`, `/sign-in(.*)`, `/sign-up(.*)`, `/profile(.*)`, `/order/success(.*)`, `/post-sign-in(.*)`, `/api/webhooks(.*)`, `/api/test-firebase(.*)`, `/api/checkout(.*)`, `/api/checkout/verify-session(.*)`. Stripe server-to-server webhook hits never hit Clerk auth middleware.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint 9 flat config |
| `node scripts/seed-products.mjs` | (Optional) Seed `products` collection from fakestoreapi.com |
| `node scripts/reconcile-missing-invoices.cjs` | (Optional, ONE-TIME) Dry-run repair plan for paid orders missing invoices |
| `DRY_RUN=false node scripts/reconcile-missing-invoices.cjs` | Apply the invoice repair plan (idempotent) |
| `ONLY_ORDER_ID=<orderId> DRY_RUN=false node scripts/reconcile-missing-invoices.cjs` | Apply repair for a single order only |

## Roadmap / Bonus Features

- [x] User authentication (Clerk)
- [x] Firestore user sync via webhook (`user.created` / `user.updated` / `user.deleted`)
- [x] Fallback post-sign-in Firestore sync
- [x] Per-user favorites migrated from `localStorage` to Firestore
- [x] Shopping cart (guest localStorage scaffolding + signed-in Firestore carts/{clerkId})
- [x] Stripe Hosted Checkout → `orders` drafts → `checkout.session.completed` webhook fulfillment
- [x] Strict auth-gated checkout (`POST /api/checkout` 401s without Clerk userId)
- [x] Per-user Order history (`/account/orders` + `/account/orders/[orderId]`)
- [x] Invoices generated atomically for every paid order (`/account/invoices` + `/account/invoices/[invoiceId]` + success page "View Invoice" CTA)
- [x] Novu order-confirmation email trigger (non-blocking, failure state persisted)
- [x] Idempotency defense-in-depth for the Stripe webhook (3-branch transaction: not-paid / paid+invoice / paid-but-missing-invoice repair)
- [x] Role-based access control (admin ↔ customer views + `/admin` dashboard)
- [x] Email change sync (App → Clerk → webhook → Firestore)
- [x] One-time reconciliation script (`reconcile-missing-invoices.cjs`) for historical paid orders missing invoices
- [x] Sort by price and rating (grid-level sort logic present; SortDropdown JSX retained for future wiring)
- [x] Pagination controls (Pagination JSX retained for future wiring)
- [ ] Deploy on Vercel + deploy Firestore rules + composite indexes via Firebase CLI
- [ ] Restore `firebase.json` + `firestore.indexes.json` at project root for `firebase deploy --only firestore:rules,indexes`

---

## Enhancement Log (Latest Additions)

The following capabilities were added on top of the base product catalog:

### Toast Notification System
- **`ToastProvider`** (`src/components/Toast.tsx`) + `useToast()` hook.
- Non-blocking, dismissible toast stack anchored fixed bottom-center with 4s auto-dismiss; optional `<Link>` CTA on each toast.
- **Signed-out favorites guard:** clicking the heart on `FavoriteButton.tsx` while signed out triggers a sign-up prompt toast ("Create an account to track favorites…") with `/sign-up` CTA instead of making the API call.

### Shopping Cart (Guest + Signed-in; Strict Auth Before Stripe)
- **`CartContext`** (`src/context/CartContext.tsx`) + `useCart()` hook.
  - **Guests:** `localStorage["cart"]` (`{ id, title, price, image, quantity }[]`).
  - **Signed-in users:** `GET` / `PUT` `/api/cart` → top-level Firestore collection `carts/{clerkId} { items: CartItem[], updatedAt }`.
  - **Merge-on-sign-in:** same `product.id` → quantities summed; localStorage cleared after sync; coalescing writes prevent empty-cart flash.
- **`/api/cart/route.ts`** — validated + deduped server-side read/write via Admin SDK; owner-gated by `auth()` userId.
- **Cart UI** (`/cart/page.tsx`):
  - Unit price, line total, and grand total shown in both USD and **PKR** (`USD × 83` via centralized `formatPKR()` helper).
  - Quantity +/- steppers + remove buttons.
  - **Auth-first flow (no more unauthenticated Stripe):** Signed-out cart clicks on the "Checkout" button do NOT call `/api/checkout`. Instead they redirect to **`/sign-up?redirect_url=<encoded /cart?auto_checkout=1>`**. After Clerk sign-up/sign-in succeeds the browser returns to `/cart?auto_checkout=1`, and a `useEffect` with an `autoRanRef` guard fires `POST /api/checkout` **one time, automatically, without a second button press**.
  - Signed-in users POST to `/api/checkout` → redirects to Stripe hosted checkout (see next section).
- **Navbar cart badge** shows live item count.
- **`/sign-in/[[...sign-in]]/page.tsx`** has an explicit `forceRedirectUrl` allowlist so dynamic `redirect_url=…` params do not trigger open-redirect behavior; unrecognized redirect URLs fall back to `/cart` (safe default).

### Stripe Checkout & Payment Flow (Authenticated-Only)
- **`/api/checkout/route.ts` (401 if Clerk userId missing):**
  - First line runs `const { userId } = auth(); if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })`. **Guest checkout is not possible.**
  - Validates cart non-empty; rejects empty-cart POSTs.
  - Resolves signed-in user's primary email via `resolveUserEmail(userId)` for Stripe `customer_email` prefill only (not identity).
  - Creates a **draft** order in `orders/{orderId} { status: "draft", items, clerkId, total, createdAt, … }`.
  - Creates a Stripe Checkout Session (`ui_mode: "hosted"`, `payment_method_types: ["card"]` only, `shipping_address_collection.allowed_countries: ["PK"]`, `phone_number_collection.enabled: true`, `metadata: { clerkId, orderId }`, `client_reference_id: orderId`).
  - `success_url` uses literal concatenation for the `{CHECKOUT_SESSION_ID}` placeholder (URLSearchParams encodes `{}` which breaks Stripe substitution).
  - Marks order `status: "pending" + stripeSessionId` before returning `{ orderId, sessionUrl }`.
- **`/order/success/page.tsx`** (server component — now shows **"Order Confirmed"** when paid):
  - Reads `order_id` + `session_id` from query; cleans the literal `{CHECKOUT_SESSION_ID}` placeholder if present.
  - Fetches order by Admin SDK; shows color-coded status badge, item count, total USD + "≈ PKR".
  - **Pending state:** amber "Finalizing your order… refresh or check your account" banner.
  - **"View Invoice" CTA (new):** Emerlad-styled Link rendered **once `order.status === "paid"`**. If `order.invoiceId` is set, deep-links to `/account/invoices/${invoiceId}`; otherwise falls back to `/account/invoices` (list page will show empty → "Your invoices will appear here" until the webhook catches up).
  - Embedded **`order-success-client.tsx`** polls `/api/checkout/verify-session` every 2s; when session reports paid, waits 1.5s then `router.refresh()`.
  - CTAs: Keep browsing → `/`, View Invoice (paid, see above), View My Account → `/account`.
- **`/api/checkout/verify-session/route.ts`**:
  - Signed-in only; `stripe.checkout.sessions.retrieve(id, { expand: ['payment_intent'] })`.
  - Owner-gated via `session.metadata.clerkId === auth().userId`.
  - Reads Firestore order doc in addition to Stripe session; returns `{ paymentStatus, status, amountTotal, paymentIntentStatus, orderId, customerEmail, invoiceId, invoiceNumber }`. Callers can stop polling as soon as `invoiceId` is stamped.

### Stripe Webhook — Atomic Transactional Fulfillment + 3-Branch Idempotency
- **`/api/webhooks/stripe/route.ts`**:
  - `bodyParser: false`; reads raw bytes via custom `readRawBody()` → `stripe.webhooks.constructEvent()`.
  - Handles **`checkout.session.completed`** only. **On fulfillment failure the handler throws (returns 5xx)** so Stripe retries the event; never silently returns 200 on a critical-id-missing failure.
  - **Dedup reads BEFORE writes:** `isWebhookAlreadyProcessed(eventId)` checks `webhook_events/{eventId}` existence and returns early 200 deduped if present. After successful fulfillment commit, `markWebhookSuccessful(eventId, "checkout.session.completed")` writes the marker doc (so Stripe can retry N times but we only run the transaction once).
  - **orderId resolution:** 3 independent fallbacks with anti-spoof validation: `findOrderIdBySessionId(sessionId) ?? session.metadata.orderId ?? session.client_reference_id`. The resolved candidate is re-read from Firestore; if the doc does not exist or `doc.clerkId !== session.metadata.clerkId` we discard it and **throw** → 500 Stripe retry.
  - If `metadata.clerkId` missing from session: throw so Stripe retries (never silently skip).
  - **Single `adminDb.runTransaction` callback** with 3-way idempotency branches:
    1. **Order NOT paid** → (a) write `status:paid` + persist customer/shipping/amount/stripePaymentIntentId; (b) upsert `customers/{clerkId}` totals increment (`totalOrders` +1, `totalSpent` += amountPaidUsd) or create for first-order customers; (c) clear `carts/{clerkId}` to `items:[]`; (d) build full `invoice` object + `transaction.set(invoices.doc(invoiceId), invoice, {merge:false})`; (e) stamp `orders/{orderId}.invoiceId + invoiceNumber`.
    2. **Order PAID AND (stamped `invoices.doc(order.invoiceId).exists` OR stray `invoices.where(orderId==orderId)` found)** → if the order's `invoiceId` pointer was missing (stray invoice created but order stamp not written), stamp the pointer now; else — truly idempotent duplicate webhook → RETURN without any writes.
    3. **Order PAID BUT invoice genuinely missing** (repair branch — new guard added after shipped bug): Skip (a) status flip, (b) customer totals increment, (c) cart clear (those side-effects already happened or must NOT double-count). Only write the missing full invoice doc + stamp the missing `invoiceId`/`invoiceNumber` on the order. **The earlier buggy short-circuit `if (existingOrder.status === "paid") return` was replaced by this 3-way check.**
  - **Invoice ID reuse chain (new):** Resolved in priority order: `existingOrder.invoiceId` → stray-by-orderId → `adminDb.collection("invoices").doc().id`. Same for `invoiceNumber`: `existingOrder.invoiceNumber` → stray doc invoiceNumber → `generateInvoiceNumber(orderId)`. **Same order always produces the same invoice ID/number forever** — no duplicates even on retry.
  - Invoice write uses `{merge:false}` (commit-or-nothing; no partial stub docs). Order stamp uses `{merge:true}`.
  - **Non-sensitive `[invoice]` logs around invoice flow:** `[invoice] processing order: <orderId>`, `[invoice] existing invoice found: <invoiceId>` / idempotent return log, `[invoice] creating invoice for order: <orderId> (first-time | repair path)`, `[invoice] invoice created: <id>`, `[invoice] transaction completed: <orderId>`. No secrets, no emails beyond user-facing orderId/invoiceId strings.
  - **`issuedAt` written unconditionally** with fallback chain `existingOrder.paidAt ?? existingOrder.updatedAt ?? now`. Because Firestore `orderBy` silently excludes docs missing the sort field, this guarantees newly created invoices always appear in `/account/invoices`.
  - **No 3-field stub invoice docs from post-tx notifications (fix):** Void post-tx block (Novu emails) reads `invoiceDocExists = invoices.doc(stampedInvoiceId ?? repairInvoiceId).get().exists` BEFORE writing `notificationStatus` to the `invoices` collection. If the base invoice doc does not exist (e.g. a crash half-wrote a run and we are now in repair-or-dry-run), writes go ONLY to `orders/{orderId}.notificationStatus` — never a stray `{ notificationStatus: 'sent', notificationSentAt, updatedAt }` doc.

### Orders Pages
- **`/account/orders/page.tsx`** (server component):
  - Simplified Firestore query: `where("clerkId","==",userId).orderBy("createdAt","desc").limit(50)`, then client-side `filter(o => o.status !== "draft")`. (The prior `status not-in` filter required a complex composite index that is not deployable alongside the invoices composite without conflicts.)
  - Row shows order short-ID, formatted date, total USD + PKR, color-coded status badge, "View Invoice" link when `invoiceId` set.
  - Empty state: **Start Shopping → `/products`** + Go to cart.
  - **Required composite index:** `orders (clerkId ASC, createdAt DESC)`.
- **`/account/orders/[orderId]/page.tsx`**:
  - Guards: signed out → `/sign-in`; doc missing, owner mismatch, or `status === "draft"` → "Order not found" card.
  - Line items table with image/title/qty/unit/subtotal USD+PKR; totals footer; status badge; "View Invoice" Link when `invoiceId` set; pending amber finalizing banner if needed.

### Invoice Pages (New)
- **`/account/invoices/page.tsx`** (list, server component):
  - Firestore query `where("clerkId", "==", userId).where("status", "==", "paid").orderBy("issuedAt", "desc")` — only paid invoices.
  - Table columns: Invoice #, Date, Order ID, Status, Amount, Actions (View).
  - Empty state: "No invoices yet" + "Start Shopping → /products" CTA.
  - **Required composite index:** `invoices (clerkId ASC, status ASC, issuedAt DESC)`.
- **`/account/invoices/[invoiceId]/page.tsx`** (detail, server component):
  - Guards: signed out → `/sign-in`; doc missing or owner mismatch → 404-style "Invoice not found".
  - Header card: "Invoice INV-…" status pill PAID (emerald), Issue date, Paid date.
  - "From" (merchant name fallback) + "Bill to" (customerName + email + shipping address).
  - Items table: Qty, Description, Unit, Subtotal.
  - Totals footer: Subtotal, Shipping (free), Total USD + "≈ PKR".
  - "Payment successful" box + "Paid on <date>".

### Account Area (`/account/*`) — Server-Side Protected, Invoices Sidebar Row Added
- **`/account/layout.tsx`** (async server component):
  - **No Clerk session** → redirect `/sign-in?redirect_url=/account`.
  - **No `customers/{clerkId}` doc** → inline `UnlockAccountScreen` (no redirect loop): "Place your first order to unlock your customer dashboard…" **Start Shopping → `/products`** + Back to cart.
  - Customer exists → header stats card (display name, email, `N orders placed · lifetime spend X.XX USD`).
  - **Sidebar (UPDATED):** `Orders → /account/orders`, **Invoices → /account/invoices** (new), `Favorites → /account/favorites`, `Profile → /account/profile` (links out to Clerk hosted profile), `Settings → /account/settings`. Top navbar still links to Favorites + Profile separately; sidebar is a customer-focused navigation shell.
- **`/account/page.tsx`**: `permanentRedirect("/account/orders")` (customer lands on order list).
- **New account pages added:** `/account/invoices/page.tsx`, `/account/invoices/[invoiceId]/page.tsx`, `/account/favorites/page.tsx` (sidebar mirror of top-navbar favorites), `/account/profile/page.tsx` (sidebar link → Clerk hosted profile), `/account/settings/page.tsx`.

### Customer-Status-Aware Navigation
1. **Navbar conditional "Order History / My Account" link:**
   - **Root layout** (`src/app/layout.tsx`) is now `async`; calls `auth()` → if userId present, runs a server-side `adminDb.collection("customers").doc(userId).get()` existence check (try/catch guarded → `false` on error), and passes `showMyAccountLink: boolean` down to `<Navbar />`.
   - Navbar (`Navbar.jsx`) renders `<Link href="/account">Order History</Link>` **only when** `showMyAccountLink && isSignedIn`. Signed-out users and signed-in users with no first-order (no customer doc) never see the link.
2. **Post-sign-in landing page smart redirect:**
   - `src/app/post-sign-in/page.tsx` runs the user-sync block unchanged; then — **only when** no explicit `redirect_url` was passed (i.e. the user wasn't mid-flow to a protected page) and `dashboardTarget` from the sanitizer is empty and the user is non-admin — checks `customers/{user.id}.exists` and **redirects to `/account`** for returning customers instead of dropping them at `/`.
   - Explicit `redirect_url` always wins; admins still go to `/admin` as before; brand-new signups with no orders keep the original default of `/`.
3. **"Continue Shopping / Start Shopping → /products" CTAs** already present in:
   - Account unlock screen (new customers)
   - Empty orders list
   - Empty invoices list
   - Order success page
4. **Navbar order (left → right):** `Product Catalog (logo → /) → Products (→ / home grid) → Cart → Favorites → [Order History (conditional)] → Profile → Sign Out / Sign In`. The "Products" entry links to `/` (the home product grid) because there is no separate `/products` listing route — all discovery lives on the homepage.

### Middleware & Public Routes
- **`src/proxy.ts`** (`clerkMiddleware` + `createRouteMatcher`):
  - Public routes include `/`, `/products(.*)`, `/cart`, `/sign-in(.*)`, `/sign-up(.*)`, `/profile(.*)`, `/order/success(.*)`, `/post-sign-in(.*)`, `/api/webhooks(.*)` (with an explicit `/api/webhooks/stripe` defensive entry), `/api/test-firebase(.*)`, `/api/checkout(.*)`, `/api/checkout/verify-session(.*)`.
  - Matcher regex excludes `_next/static`, `_next/image`, favicon, and image assets; also excludes `/api/webhooks(.*)` from middleware enforcement so Stripe server-to-server POSTs are never 401'd.
  - Signed-out hits on `/account*` bounce through `/sign-in?returnBackUrl=/post-sign-in?redirect_url=<protected path>` so the post-sign-in sync/redirect runs before navigation.

### Firebase Stability Fixes (Browser + Admin)
- **Browser WebChannel transport timeouts ("Backend didn't respond within 10 seconds") fixed:** `src/lib/firebase/client.ts` now uses `initializeFirestore(app, { experimentalForceLongPolling: true, ignoreUndefinedProperties: true })` instead of `getFirestore()`. Users on restrictive corporates/mobile NATs no longer see the Firestore client SDK silently hang mid-list-read.
- **Composite index drafts documented + to be deployed (written in this README as inline JSON blocks):**
  - `orders (clerkId ASC, createdAt DESC)` for `/account/orders` list.
  - `invoices (clerkId ASC, status ASC, issuedAt DESC)` for `/account/invoices` list.
- Drafts were also written to a local `firestore.indexes.json` file + `firebase.json` earlier but both were later lost from the working tree; restore them from the inline JSON in this README before running `firebase deploy --only firestore:indexes`.

### Novu Order-Confirmation Emails (Non-Blocking)
- **`src/lib/email.ts` `sendOrderConfirmation(invoice: Invoice)`:**
  - Builds `OrderConfirmationPayload` = `{ to, firstName, orderId, orderNumber: invoiceNumber, orderDate, orderTotalUsd, orderItems[], customerEmail, customerName, invoiceNumber, orderUrl, invoiceUrl }`.
  - Reads `NOVU_API_KEY` + `NOVU_WORKFLOW_ID` from env. If `NOVU_API_KEY` is empty (local dev common), logs gracefully `[novu] NOVU_API_KEY not set, skipping…` and returns false — no crash.
  - When key present, triggers Novu via `POST https://api.novu.co/v1/events/trigger` with subscriberId = `clerkUserId ?? customerEmail`.
- **Invocation in the Stripe webhook:** Runs inside a `void (async () => { try {...} catch {...} })()` block AFTER the transaction commits. NEVER blocks the 200 back to Stripe.
- **Notification status persistence:** After trigger success → writes `notificationStatus: "sent"` + `notificationSentAt` on `orders/{orderId}` AND (base invoice doc exists check) `invoices/{invoiceId}`. If trigger fails → writes `notificationStatus: "failed"` + `notificationError` + `notificationFailedAt` to the same pair of docs (if invoice exists; otherwise ONLY orders doc — prevents 3-field stubs).

### ONE-TIME Reconciliation Script (Repair Paid Orders Missing Invoices)
- **`scripts/reconcile-missing-invoices.cjs` (New):**
  - Purpose: Repair the ~historical paid orders that existed before the 3-branch idempotency fix shipped. Also safe to re-run AFTER deploy to catch any "paid but invoice missing" edge cases the webhook repaired path missed.
  - Loads `.env.local` IN-MEMORY (inline parser, no secrets copied) for `FIREBASE_SERVICE_ACCOUNT_BASE64`. Uses Firebase Admin directly (no Next runtime).
  - **Safe defaults:** `DRY_RUN=true` by default (prints a plan, writes 0 docs). `ONLY_ORDER_ID=<id>` optional scoping.
  - Targets only `orders.status === "paid" && !(order.invoiceId set AND invoices.doc(order.invoiceId).exists || invoices.where(orderId==orderId) non-empty)`.
  - Idempotent:
    - Re-runs dedup: if an invoice already exists by the same orderId search, reuses that doc id/number instead of creating a second one.
    - `runTransaction` wraps the invoice write + order stamp.
  - Customer-safe: **Never** increments `customers.totalOrders`, never re-clears `carts/{clerkId}`, never changes `order.status`, never calls Stripe or Novu, never resends email. Only writes (a) the missing invoice doc, (b) the missing `invoiceId/invoiceNumber` stamp on the order.
  - Usage examples in [Scripts](#scripts) section above.

### REMOVED Flows (Deleted Code — Documented Here for Reference)
The following flows were explicitly removed from the codebase. Do not re-add without explicit approval — current architecture depends on their absence.

1. **Guest Checkout / Accept-Token Magic Link flow (ENTIRELY removed):**
   - Deleted `src/app/accept-token/page.tsx` + any associated route handlers.
   - Deleted associated test routes (`src/app/api/__test-accept-token/route.ts`, `src/app/api/test-firebase/accept-token/route.ts` — confirmed no longer present).
   - Deleted `buildMagicSignInUrl`, `findOrCreateClerkUserId`, `resolveClerkUserIdByEmail`, `createClerkUserFromEmail`, and all `signInTokens.createSignInToken` logic from `src/lib/email.ts` and the webhook.
   - Deleted `magicSignInUrl` field from the `OrderConfirmationPayload` sent to Novu (Novu trigger no longer expects or links out to one-click sign-in tokens).
   - Replaced everywhere by: **Clerk auth happens BEFORE `POST /api/checkout` is allowed to return 200.** See `/cart/page.tsx` auto_checkout redirect and `/api/checkout/route.ts` line-one `auth().userId` 401 guard.

2. **Silent orderId-resolution short-circuits replaced by explicit throws:**
   - Old webhook used to `return;` (HTTP 200 OK) when `orderId` couldn't be resolved. Because the marker was written, Stripe never retried → orders permanently unpaid/invoiceless.
   - New behavior: `throw new Error(...)` → handler returns 500 → Stripe retries automatically up to its retry policy window.

3. **Orders list `status not-in ["draft"]` clause removed:**
   - Old query required a 3-part composite that conflicted with the invoices index deploy plan.
   - Replacement: simple `where(clerkId) + orderBy(createdAt desc) + client filter`.

4. **Post-tx invoice-collection `{merge:true}` writes NO LONGER happen without a prior base-doc existence check.**
   - Formerly: a stray repair-run could accidentally create a 3-field `{ notificationStatus, notificationSentAt, updatedAt }` stub invoice doc that then polluted listings (and silently disappeared from `orderBy issuedAt desc`).
   - Fixed now with `invoiceDocExists` guard both in the webhook void block AND (re-implemented identically in) the reconcile script for symmetry.

### Firestore Security Rules (`firestore.rules`)
- Helper predicates: `isSignedIn`, `currentUid`, `hasClerkRole(role)`, `isAdmin` (custom claims).
- **orders:**
  - `create`: `status == "draft"` + `keys().hasOnly([clerkId, items, total, status, createdAt])` + `request.resource.data.clerkId == currentUid()`.
  - `read`: owner-only (`resource.data.clerkId == currentUid()`).
  - `update`: owner-only **AND** `!statusFieldChanged()` (status immutable via client; only Admin SDK/webhook flips to paid).
  - `delete`: `false`.
- **customers:** owner read-only; zero client writes (webhook/Admin SDK only).
- **carts/{uid}:** owner read + write only.
- **users/{uid}/favorites/{id}:** owner read + write only (favorites subcollection pattern).
- **products:** public read; writes require `hasClerkRole("admin")`.
- **reviews:** public read; create binds `clerkId == currentUid`; owner update/delete.

### Vercel Deployment Checklist
1. Env vars in Vercel Project Settings → Environment Variables (all scopes unless explicitly server-only noted):
   - **Clerk:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/post-sign-in`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/post-sign-in`, `CLERK_WEBHOOK_SECRET` (from Clerk Dashboard webhook endpoint), `CLERK_JWT_ISSUER_DOMAIN` (if custom domain/Custom JWT template used).
   - **Firebase client:** `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.
   - **Firebase Admin (SERVER-ONLY scopes):** `FIREBASE_SERVICE_ACCOUNT_BASE64` — base64 of the full service-account JSON.
   - **Stripe (SERVER-ONLY scopes):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (`whsec_…` from Stripe Dashboard → Webhooks → hosted endpoint signing secret).
   - **App URL:** `NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>` (used in success routes and invoice/order URL construction).
   - **Novu (SERVER-ONLY scopes):** `NOVU_API_KEY` (optional; leave blank during pre-prod smoke tests), `NOVU_WORKFLOW_ID=order-confirmation`.
2. **Clerk Dashboard paths:** add the Vercel production (and preview) domains to **Paths → Domains** so sessions work on non-localhost. Configure the Svix webhook endpoint as `https://<your-vercel-domain>/api/webhooks/clerk` with the events `user.created`, `user.updated`, `user.deleted`.
3. **Firebase console (Auth → Settings → Authorized domains):** add the Vercel production/preview domains so Firebase client SDK can initialize from the browser.
4. **Stripe Dashboard → Webhooks:** add hosted endpoint `https://<your-vercel-domain>/api/webhooks/stripe` listening to `checkout.session.completed`; place signing secret into `STRIPE_WEBHOOK_SECRET` env var. Enable payment methods = card only (disable Link/Apple Pay/Payment Request Button account-wide if they still appear per Stripe settings override). In Stripe → Checkout Settings → Set allowed countries = Pakistan (PK) + any extras you ship to; this matches the webhook `shipping_address_collection.allowed_countries=["PK"]` set in `/api/checkout`.
5. **Firestore composite indexes (2 composites):** re-create `firebase.json` + `firestore.indexes.json` locally from the JSON blocks in this README, then run `firebase deploy --only firestore:rules,firestore:indexes`. Trigger an order list + invoices list load from a real signed-in user account after deployment; confirm no "FAILED_PRECONDITION 9 — composite index required" errors in browser console.
6. **Post-deploy smoke test order:** (1) Sign up as fresh user → cart → auto_checkout → Stripe test card 4242 4242 4242 4242 (success) → confirm `/order/success` shows "Order Confirmed" + "View Invoice". (2) `/account/orders` shows the order. (3) `/account/invoices` shows INV-… entry; click through to detail. (4) Replay the same Stripe `evt_…` id from Dashboard → Developers → Webhooks → your endpoint → Logs → Resend. Confirm NO duplicate invoice docs appear and `/account/invoices` still shows exactly ONE row.
7. Redeploy env vars: `vercel env pull` is not needed; Vercel injects them on deploy. Trigger a production redeploy after env vars are set the first time so they take effect.
8. **After first production deploy:** run `ONLY_ORDER_ID=<oldestBrokenOrderId> DRY_RUN=false node scripts/reconcile-missing-invoices.cjs` for the oldest invoice-less paid order first. If one order repairs cleanly, run the full scoped scan: `DRY_RUN=false node scripts/reconcile-missing-invoices.cjs`.

### Files Added / Changed Summary (All Enhancement Rounds)
- **New lib helpers:** `src/lib/currency.ts`, `src/lib/stripe.ts`, `src/lib/email.ts` (Novu trigger + payload), `src/lib/types.ts` extended with `Customer`, `CartItem`, `Order`, `OrderStatus`, `OrderShipping`, `Invoice`, plus `notificationStatus/notificationSentAt/notificationFailedAt/notificationError` on both `Order` and `Invoice`.
- **Context / hooks:** `src/context/CartContext.tsx`, `src/hooks/useCart.ts`, `src/context/FavoritesContext.tsx`, `src/hooks/useFavorites.ts`.
- **Components:** `src/components/Toast.tsx` (Provider + useToast), `FavoriteButton.tsx` (signed-out guard), `AddToCartButton.tsx`, Navbar updated with conditional customer link, `order-success-client.tsx` (payment-status polling, invoice-generation polling removed/simplified), Navbar.jsx + product JSX components retained.
- **App routes:** `/cart/page.tsx` (auth-first auto_checkout), `/order/success/page.tsx` (title updated → "Order Confirmed" + new View Invoice CTA) + `order-success-client.tsx`, `/account/layout.tsx` + `/account/page.tsx` (redirect) + `/account/orders/page.tsx` (removed not-in filter) + `/account/orders/[orderId]/page.tsx` (View Invoice link), `/account/invoices/page.tsx` (new list) + `/account/invoices/[invoiceId]/page.tsx` (new detail), `/account/favorites/page.tsx`, `/account/profile/page.tsx`, `/account/settings/page.tsx`, `/sign-in/[[...sign-in]]/page.tsx` (redirect_url allowlist), `/post-sign-in/page.tsx` extended (customer-aware redirect).
- **API routes:** `/api/cart/route.ts`, `/api/checkout/route.ts` (userId 401-at-top + guest flow deleted), `/api/checkout/verify-session/route.ts` (now returns order's `invoiceId/invoiceNumber` for polling), `/api/webhooks/stripe/route.ts` (raw body + 3-branch idempotency + invoice atomic write + notificationStatus guard + non-sensitive [invoice] logs + explicit throws instead of silent returns), `/api/webhooks/clerk/route.ts` (Svix dedup via `webhook_events`).
- **Middleware / proxy:** `src/proxy.ts` — public routes expanded with `/cart`, `/api/checkout(.*)`, `/api/checkout/verify-session(.*)`; webhook carve-outs intact.
- **Security:** `firestore.rules` (already written; deploy via Firebase CLI).
- **Config / plumbing:** Root layout made `async` to run server-side `auth()` + customer-exists flag propagation to Navbar. `src/lib/firebase/client.ts` switched to `experimentalForceLongPolling:true` + `ignoreUndefinedProperties:true` to fix browser WebChannel hangs.
- **One-time scripts:** `scripts/reconcile-missing-invoices.cjs` (new, idempotent repair — DRY_RUN by default).
