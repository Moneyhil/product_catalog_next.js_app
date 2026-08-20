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

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Webpack)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Product API:** [Fake Store API](https://fakestoreapi.com/products)
- **Authentication:** [Clerk](https://clerk.com/) (`@clerk/nextjs`)
- **Database:** [Firebase Firestore](https://firebase.google.com/docs/firestore) via `firebase-admin` (server-side writes) and `firebase` client SDK
- **Webhook Security:** Svix (Clerk webhook signature verification)
- **State Management:** React Context API (for Favorites state)
- **Persistence:** Firestore (user records + per-user favorites)

## Project Structure

```
product-catalog/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout: ClerkProvider + FavoritesProvider
│   │   ├── page.tsx                    # Home page — products grid with search/filter/sort/pagination
│   │   ├── globals.css
│   │   ├── loading.tsx                 # Global loading state
│   │   ├── error.tsx                   # Global error boundary
│   │   ├── not-found.tsx               # Custom 404 page
│   │   ├── admin/
│   │   │   └── page.tsx                # Admin user management (role change)
│   │   ├── favorites/
│   │   │   └── page.tsx                # User's saved favorites list
│   │   ├── post-sign-in/
│   │   │   └── page.tsx                # Fallback Firestore sync on every login
│   │   ├── profile/
│   │   │   └── [[...profile]]/
│   │   │       └── page.tsx            # Clerk <UserProfile /> hosted page
│   │   ├── sign-in/
│   │   │   └── [[...sign-in]]/
│   │   │       └── page.tsx            # Clerk hosted sign-in page
│   │   ├── sign-up/
│   │   │   └── [[...sign-up]]/
│   │   │       └── page.tsx            # Clerk hosted sign-up page
│   │   ├── products/
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Dynamic product details page
│   │   │       ├── loading.tsx
│   │   │       └── error.tsx
│   │   └── api/
│   │       ├── admin/
│   │       │   └── set-role/
│   │       │       └── route.ts        # PATCH — change user role (admin only)
│   │       ├── favorites/
│   │       │   └── route.ts            # GET + PATCH — per-user favorites in Firestore
│   │       ├── test-firebase/
│   │       │   └── route.ts            # GET — quick Firebase Admin health check
│   │       ├── user/
│   │       │   ├── sync/
│   │       │   │   └── route.ts        # POST — on-demand Clerk → Firestore sync
│   │       │   └── update-email/
│   │       │       └── route.ts        # PATCH — update email in Clerk (triggers webhook)
│   │       └── webhooks/
│   │           └── clerk/
│   │               └── route.ts        # Clerk Svix webhook: user.created/updated/deleted
│   │
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── ProductGrid.tsx             # Search + filter + sort + pagination + grid
│   │   ├── ProductCard.tsx
│   │   ├── SearchBar.tsx
│   │   ├── CategoryFilter.tsx
│   │   ├── SortDropdown.jsx            # Sort by price / rating
│   │   ├── Pagination.jsx              # Page numbers + size selector
│   │   ├── FavoriteButton.tsx          # Heart toggle (client-side)
│   │   ├── RatingStars.jsx             # 5-star rating display
│   │   ├── Loader.jsx                  # Spinner component
│   │   └── RoleSelect.tsx              # Admin: user role picker (customer ↔ admin)
│   │
│   ├── context/
│   │   └── FavoritesContext.tsx        # Favorites state + Firestore API wrapper
│   │
│   ├── hooks/
│   │   └── useFavorites.ts             # Hook wrapper around FavoritesContext
│   │
│   └── lib/
│       ├── api.ts                      # Fake Store API fetch functions
│       ├── types.ts                    # Shared TypeScript types (Product, Rating)
│       ├── constants.ts                # App-wide constants
│       └── firebase/
│           ├── admin.ts                # Firebase Admin SDK (adminDb) — server-only
│           └── client.ts               # Firebase client SDK (db)
│
├── scripts/
│   └── seed-products.mjs               # (Optional) seed products data helper
│
├── ngrok/
│   └── ngrok.exe                       # Local tunnel for Clerk webhook dev
│
├── public/
├── tailwind.config.js
├── next.config.ts
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
```

> ⚠️ `CLERK_WEBHOOK_SECRET` is the signing secret from your Clerk Dashboard's webhook endpoint config (used to verify incoming `svix` webhook signatures). `FIREBASE_SERVICE_ACCOUNT_BASE64` is generated by base64-encoding the full JSON key downloaded from **Firebase Console → Project Settings → Service Accounts → Generate new private key**.

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
| `/api/webhooks/clerk` | POST | Svix sig | Clerk user event receiver → Firestore sync |
| `/api/favorites` | GET | ✅ User | Get current user's favorite product IDs |
| `/api/favorites` | PATCH | ✅ User | Add/remove favorite (`{ productId, action: "add"\|"remove" }`) |
| `/api/admin/set-role` | PATCH | ✅ Admin | Change a user's role (`{ targetClerkId, newRole: "admin"\|"customer" }`) |
| `/api/user/sync` | POST | ✅ User | Force re-sync current user from Clerk → Firestore |
| `/api/user/update-email` | PATCH | ✅ User | Update email in Clerk (triggers webhook → Firestore) |
| `/api/test-firebase` | GET | — | Health check: verifies Firebase Admin connectivity |

Fake Store API (product data) endpoints are documented at [fakestoreapi.com](https://fakestoreapi.com/).

## Key Implementation Notes

- **Server vs Client Components:** Pages fetch product data on the server (async Server Components). Interactive elements — search, filtering, sorting, pagination, favoriting, role selection — are Client Components (`"use client"`).
- **Favorites persistence:** Per-user `favorites: number[]` array stored directly on each Firestore user document (not `localStorage`). Written server-side via the Admin SDK; read back via `FavoritesContext` which wraps `/api/favorites`.
- **Type safety:** Product data uses the shared `Product` interface (`src/lib/types.ts`); user-facing APIs validate inputs with `typeof` / shape guards.
- **Source of truth:** Always **Clerk** for identity, email, role, and name. Firestore is a synchronized copy. Never mutate `email` or `role` directly in Firestore — always go through Clerk APIs first.
- **`createdAt` immutability:** Every write path (`user.created`, `user.updated`, post-sign-in, favorites guard) reads an existing `createdAt` first and only sets it if absent, so the original signup timestamp is preserved forever.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server (Webpack) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Roadmap / Bonus Features

- [x] User authentication (Clerk)
- [x] Firestore user sync via webhook (`user.created` / `user.updated` / `user.deleted`)
- [x] Fallback post-sign-in Firestore sync
- [x] Per-user favorites migrated from `localStorage` to Firestore
- [x] Pagination
- [x] Sort by price and rating
- [x] Role-based access control (admin ↔ customer views + `/admin` dashboard)
- [x] Email change sync (App → Clerk → webhook → Firestore)
- [ ] Deploy on Vercel

---

## Enhancement Log (Latest Additions)

The following capabilities were added on top of the base product catalog:

### Toast Notification System
- **`ToastProvider`** (`src/components/Toast.tsx`) + `useToast()` hook.
- Non-blocking, dismissible toast stack anchored fixed bottom-center with 4s auto-dismiss; optional `<Link>` CTA on each toast.
- **Signed-out favorites guard:** clicking the heart on `FavoriteButton.tsx` while signed out triggers a sign-up prompt toast ("Create an account to track favorites…") with `/sign-up` CTA instead of making the API call.

### Shopping Cart (Guest + Signed-in)
- **`CartContext`** (`src/context/CartContext.tsx`) + `useCart()` hook.
  - **Guests:** `localStorage["cart"]` (`{ id, title, price, image, quantity }[]`).
  - **Signed-in users:** `GET` / `PUT` `/api/cart` → top-level Firestore collection `carts/{clerkId} { items: CartItem[], updatedAt }`.
  - **Merge-on-sign-in:** same `product.id` → quantities summed; localStorage cleared after sync; coalescing writes prevent empty-cart flash.
- **`/api/cart/route.ts`** — validated + deduped server-side read/write via Admin SDK; owner-gated by `auth()` userId.
- **Cart UI** (`/cart/page.tsx`):
  - Unit price, line total, and grand total shown in both USD and **PKR** (`USD × 83` via centralized `formatPKR()` helper).
  - Quantity +/- steppers + remove buttons.
  - Signed-out users see "Sign in to checkout" → `/sign-in?redirect_url=/cart`.
  - Signed-in users POST to `/api/checkout` → redirects to Stripe hosted checkout.
- **Navbar cart badge** shows live item count.

### Shared Currency Helper
- **`src/lib/currency.ts`** exposes:
  - `formatPKR(usd: number): string` = `PKR ${Math.round(usd * 83).toLocaleString("en-PK")}` (centralized PKR conversion).
  - `formatUSD(usd: number): string`.
- Used on product cards, product detail page, cart page, order listings, order details, and order totals.

### Stripe Checkout & Payment Flow
- **`/api/checkout/route.ts`**:
  - Auth-gated; validates cart non-empty.
  - Creates a **draft** order in `orders/{orderId} { status: "draft", items, clerkId, total, createdAt }`.
  - Creates a Stripe Checkout Session (`ui_mode: "hosted"`, `payment_method_types: ["card"]` only, `shipping_address_collection.allowed_countries: ["PK"]`, `phone_number_collection.enabled: true`).
  - `success_url` uses literal concatenation for the `{CHECKOUT_SESSION_ID}` placeholder (URLSearchParams encodes `{}` which breaks Stripe substitution).
  - Marks order `status: "pending" + stripeSessionId` before returning `{ orderId, sessionUrl }`.
- **`/order/success/page.tsx`** (server component):
  - Reads `order_id` + `session_id` from query; cleans the literal `{CHECKOUT_SESSION_ID}` placeholder if present.
  - Fetches order by Admin SDK; shows color-coded status badge, item count, total USD + "≈ PKR".
  - **Pending state:** amber "Finalizing your order… refresh or check your account" banner.
  - Embedded **`order-success-client.tsx`** polls `/api/checkout/verify-session` every 2s; when session reports paid, waits 1.5s then `router.refresh()`.
  - CTAs: Keep browsing → `/`, View My Account → `/account`.
- **`/api/checkout/verify-session/route.ts`**:
  - Signed-in only; `stripe.checkout.sessions.retrieve(id, { expand: ['payment_intent'] })`.
  - Owner-gated via `session.metadata.clerkId === auth().userId`.
  - Returns `{ paymentStatus, status, amountTotal, paymentIntentStatus, orderId, customerEmail }`.

### Stripe Webhook (Atomic Transactional Fulfillment)
- **`/api/webhooks/stripe/route.ts`**:
  - `bodyParser: false`; reads raw bytes via custom `readRawBody()` → `stripe.webhooks.constructEvent()`.
  - Handles **`checkout.session.completed`** only; always returns 200 to Stripe after signature verification even on internal errors.
  - Single **Firestore Admin SDK `runTransaction`** covering:
    1. All reads first (orderRef.get → customerRef.get) — required ordering for Firestore transactions.
    2. Order `status → "paid"`; persists `phone`, `shipping` (PK address normalized `postal_code → postalCode`), `stripePaymentIntentId`, `customerEmail`, `amountPaidUsd`, timestamps.
    3. Customer **upsert** into `customers/{clerkId}`:
       - New: `{ clerkId, stripeCustomerId, name, email, totalOrders: 1, totalSpent: amountPaidUsd, createdAt, updatedAt }`.
       - Existing: `totalOrders++`, `totalSpent += amountPaidUsd`, touch `updatedAt`.
    4. Clear matching user cart → `carts/{clerkId} { items: [], updatedAt }`.
  - **Idempotency:** skips the entire fulfillment if `order.status === "paid"` already.

### Orders Pages
- **`/account/orders/page.tsx`** (server component):
  - Firestore query `where("clerkId","==",userId).where("status","not-in",["draft"]).orderBy("createdAt","desc")`.
  - Row shows order short-ID, formatted date, total USD + PKR, color-coded status badge.
  - Empty state: **Start Shopping → `/products`** + Go to cart.
  - **Requires composite index:** `(clerkId ASC, status NOT_IN, createdAt DESC)`.
- **`/account/orders/[orderId]/page.tsx`**:
  - Guards: signed out → `/sign-in`; doc missing, owner mismatch, or `status === "draft"` → "Order not found" card.
  - Line items table with image/title/qty/unit/subtotal USD+PKR; totals footer; status badge; pending amber finalizing banner if needed.

### Account Area (`/account/*`) — Server-Side Protected
- **`/account/layout.tsx`** (async server component):
  - **No Clerk session** → redirect `/sign-in?redirect_url=/account`.
  - **No `customers/{clerkId}` doc** → inline `UnlockAccountScreen` (no redirect loop): "Place your first order to unlock your customer dashboard…" **Start Shopping → `/products`** + Back to cart.
  - Customer exists → header stats card (display name, email, `N orders placed · lifetime spend X.XX USD`).
  - **Sidebar:** `Orders → /account/orders` only (Profile/Favorites/Settings removed — already in top navbar; Products removed — top navbar Products link is the main entry point).
- **`/account/page.tsx`**: `permanentRedirect("/account/orders")` (customer lands on order list).

### Customer-Status-Aware Navigation
1. **Navbar conditional "Order History / My Account" link:**
   - **Root layout** (`src/app/layout.tsx`) is now `async`; calls `auth()` → if userId present, runs a server-side `adminDb.collection("customers").doc(userId).get()` existence check (try/catch guarded → `false` on error), and passes `showMyAccountLink: boolean` down to `<Navbar />`.
   - Navbar (`Navbar.jsx`) renders `<Link href="/account">Order History</Link>` **only when** `showMyAccountLink && isSignedIn`. Signed-out users and signed-in users with no first-order (no customer doc) never see the link.
2. **Post-sign-in landing page smart redirect:**
   - `src/app/post-sign-in/page.tsx` runs the user-sync block unchanged; then — **only when** no explicit `redirect_url` was passed (i.e., the user wasn't mid-flow to a protected page) and `dashboardTarget` from the sanitizer is empty and the user is non-admin — checks `customers/{user.id}.exists` and **redirects to `/account`** for returning customers instead of dropping them at `/`.
   - Explicit `redirect_url` always wins; admins still go to `/admin` as before; brand-new signups with no orders keep the original default of `/`.
3. **"Continue Shopping / Start Shopping → /products" CTAs** already present in:
   - Account unlock screen (new customers)
   - Empty orders list
   - Order success page
4. **Navbar order (left → right):** `Product Catalog (logo → /) → Products (→ / home grid) → Cart → Favorites → [Order History (conditional)] → Profile → Sign Out / Sign In`. The "Products" entry links to `/` (the home product grid) because there is no separate `/products` listing route in this codebase — all discovery lives on the homepage.

### Middleware & Public Routes
- **`src/proxy.ts`** (`clerkMiddleware` + `createRouteMatcher`):
  - Public routes include `/`, `/sign-in*`, `/sign-up*`, `/profile*`, `/order/success*`, `/post-sign-in*`, `/api/webhooks*` (with an explicit `/api/webhooks/stripe` defensive entry), `/api/test-firebase*`.
  - Matcher regex excludes `_next/static`, `_next/image`, favicon, and image assets; also excludes `/api/webhooks(.*)` from middleware enforcement so Stripe server-to-server POSTs are never 401'd.
  - Signed-out hits on `/account*` bounce through `/sign-in?returnBackUrl=/post-sign-in?redirect_url=<protected path>` so the post-sign-in sync/redirect runs before navigation.

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
1. Env vars in Vercel Project Settings → Environment Variables (all scopes unless noted):
   - **Clerk:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/post-sign-in`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/post-sign-in`, `CLERK_WEBHOOK_SECRET` (from Clerk Dashboard webhook endpoint), `CLERK_JWT_ISSUER_DOMAIN` (if custom domain/Custom JWT template used).
   - **Firebase client:** `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.
   - **Firebase Admin:** `FIREBASE_SERVICE_ACCOUNT_BASE64` — base64 of the full service-account JSON (server-only scopes).
   - **Stripe:** `STRIPE_SECRET_KEY` (server-only), `STRIPE_WEBHOOK_SECRET` (`whsec_…` from Stripe Dashboard → Webhooks → hosted endpoint signing secret, server-only).
2. **Clerk Dashboard paths:** add the Vercel production (and preview) domains to **Paths → Domains** so sessions work on non-localhost. Configure the Svix webhook endpoint as `https://<your-vercel-domain>/api/webhooks/clerk` with the events `user.created`, `user.updated`, `user.deleted`.
3. **Firebase console (Auth → Settings → Authorized domains):** add the Vercel production/preview domains so Firebase client SDK can initialize from the browser.
4. **Stripe Dashboard → Webhooks:** add hosted endpoint `https://<your-vercel-domain>/api/webhooks/stripe` listening to `checkout.session.completed`; place signing secret into `STRIPE_WEBHOOK_SECRET` env var. Enable payment methods = card only (disable Link/Apple Pay/Payment Request Button account-wide if they still appear per Stripe settings override).
5. **Firestore composite index:** deploy once via `firebase deploy --only firestore:rules` and then trigger an orders list load from a real user; follow the "index required" link in browser console (or build manually on `orders` collection: fields `clerkId` ASC + `status` array-contains/NOT_IN + `createdAt` DESC).
6. Redeploy env vars: `vercel env pull` is not needed; Vercel injects them on deploy. Trigger a production redeploy after env vars are set the first time so they take effect.

### Files Added / Changed Summary (Enhancement Rounds)
- **New lib helpers:** `src/lib/currency.ts`, `src/lib/types.ts` extended with `Customer`, `CartItem`, `Order`, `OrderStatus`.
- **Context / hooks:** `src/context/CartContext.tsx`, `src/hooks/useCart.ts`, `src/context/FavoritesContext.tsx`, `src/hooks/useFavorites.ts`.
- **Components:** `src/components/Toast.tsx` (Provider + useToast), `FavoriteButton.tsx` (signed-out guard), `AddToCartButton.tsx`, Navbar updated with conditional customer link, `order-success-client.tsx` (polling).
- **App routes:** `/cart/page.tsx`, `/order/success/page.tsx` (+ `order-success-client.tsx`), `/account/layout.tsx` + `/account/page.tsx` (redirect) + `/account/orders/page.tsx` + `/account/orders/[orderId]/page.tsx`, `/post-sign-in/page.tsx` extended (customer-aware redirect).
- **API routes:** `/api/cart/route.ts`, `/api/checkout/route.ts`, `/api/checkout/verify-session/route.ts`, `/api/webhooks/stripe/route.ts`.
- **Middleware / proxy:** `src/proxy.ts` — public routes, dashboard redirect loop fix, webhook carve-out.
- **Security:** `firestore.rules` deployed.
- **Config / plumbing:** Root layout server-side `auth()` + customer-exists flag propagation to Navbar.
