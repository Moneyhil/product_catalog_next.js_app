'use client';

import Link from 'next/link';
import type { Product } from '@/lib/types';
import FavoriteButton from '@/components/FavoriteButton';
import RatingStars from './RatingStars';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const price = `PKR ${Math.round(product.price * 83)}`;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="relative">
        <img
          src={product.image}
          alt={product.title}
          className="mb-4 h-48 w-full rounded-xl object-contain"
        />

        <div className="absolute right-2 top-2">
          <FavoriteButton product={product} />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
          {product.title}
        </h3>

        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
            {product.category}
          </span>
          <span className="text-lg font-bold text-slate-900">{price}</span>
        </div>

        <RatingStars rating={product.rating?.rate || 0} />
      </div>
    </Link>
  );
}
