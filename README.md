# Product Catalog

A responsive product catalog web app built with Next.js (App Router) and Tailwind CSS, consuming the [Fake Store API](https://fakestoreapi.com/). Built as part of a React.js & Next.js internship task.

## Features

- 🏠 Home page displaying all products in a responsive grid
- 🔍 Search products by title (case-insensitive, live filtering)
- 🗂️ Filter products by category
- 📄 Dynamic product details page (`/products/[id]`)
- ❤️ Add/remove products from Favorites (persisted in `localStorage`)
- ⏳ Loading and error states for data fetching
- 🚫 Custom 404 page for invalid product routes
- 📱 Fully responsive UI (mobile, tablet, desktop)

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **API:** [Fake Store API](https://fakestoreapi.com/products)
- **State Management:** React Context API (for Favorites)
- **Persistence:** Browser `localStorage`

## Project Structure

product-catalog/
├── src/
│ ├── app/
│ │ ├── layout.tsx # Root layout, wraps app in FavoritesProvider
│ │ ├── page.tsx # Home page — fetches & displays all products
│ │ ├── globals.css
│ │ ├── loading.tsx # Global loading state
│ │ ├── error.tsx # Global error boundary
│ │ ├── not-found.tsx # Custom 404 page
│ │ └── products/
│ │ └── [id]/
│ │ ├── page.tsx # Dynamic product details page
│ │ ├── loading.tsx
│ │ └── error.tsx
│ │
│ ├── components/
│ │ ├── Navbar.tsx
│ │ ├── ProductGrid.tsx # Handles search + filter + grid layout
│ │ ├── ProductCard.tsx
│ │ ├── SearchBar.tsx
│ │ ├── CategoryFilter.tsx
│ │ └── FavoriteButton.tsx
│ │
│ ├── context/
│ │ └── FavoritesContext.tsx # Favorites state + localStorage sync
│ │
│ ├── hooks/
│ │ └── useFavorites.ts # Hook wrapper around FavoritesContext
│ │
│ └── lib/
│ ├── api.ts # API fetch functions
│ ├── types.ts # Shared TypeScript types (Product, Rating)
│ └── constants.ts # App-wide constants
│
├── public/
├── tailwind.config.js
├── next.config.ts
├── package.json
└── README.md

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- npm (comes bundled with Node.js)

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

3. Run the development server
```bash
   npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Reference

This project consumes the public [Fake Store API](https://fakestoreapi.com/):

| Endpoint | Description |
|---|---|
| `GET /products` | Fetch all products |
| `GET /products/{id}` | Fetch a single product by ID |
| `GET /products/categories` | Fetch all available categories |
| `GET /products/category/{category}` | Fetch products within a category |

## Key Implementation Notes

- **Server vs Client Components:** The home page and product details page fetch data on the server (async Server Components). Interactive elements — search, filtering, favoriting — are Client Components (`"use client"`).
- **Favorites persistence:** Managed via React Context (`FavoritesContext`), synced to `localStorage` on every change, and rehydrated on app load.
- **Type safety:** All product data is typed via a shared `Product` interface (`src/lib/types.ts`), used consistently across API functions and components.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Roadmap / Bonus Features

- [ ] Pagination
- [ ] Sort by price and rating
- [ ] Persist favorites using localStorage
- [ ] Deploy on Vercel

