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
