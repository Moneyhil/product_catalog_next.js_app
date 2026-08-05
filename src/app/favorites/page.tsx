'use client';

import Link from 'next/link';
import { useFavorites } from '@/hooks/useFavorites';
import ProductCard from '@/components/ProductCard';

export default function FavoritesPage() {
  const { favorites } = useFavorites();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-semibold text-slate-900">
        Your Favorites
      </h1>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <p className="text-slate-500">
            You haven&apos;t added any favorites yet.
          </p>
          <Link
            href="/"
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favorites.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}