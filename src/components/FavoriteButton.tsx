"use client";

import type { MouseEvent } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import type { Product } from "@/lib/types";

interface FavoriteButtonProps {
  product: Product;
}

export default function FavoriteButton({ product }: FavoriteButtonProps) {
  const { isFavorite, isSignedIn, toggleFavorite } = useFavorites();
  const favorite = isFavorite(product.id);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void toggleFavorite(product);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isSignedIn}
      className={`rounded-full bg-white/90 p-2 shadow-sm transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 ${favorite ? "text-red-500" : "text-slate-500"}`}
      aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill={favorite ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={favorite ? 0 : 2}
      >
        <path d="M12 20s-6.75-4.35-9-8.1C1.5 9.3 2.4 5.7 5.7 4.8c1.9-.5 3.8.2 4.8 1.8 1-.9 2.9-2.3 4.8-1.8 3.3.9 4.2 4.5 2.7 8.1-2.25 3.75-9 8.1-9 8.1Z" />
      </svg>
    </button>
  );
}
