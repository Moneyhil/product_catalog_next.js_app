"use client";

import type { MouseEvent } from "react";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/components/Toast";
import type { Product } from "@/lib/types";

interface AddToCartButtonProps {
  product: Product;
  quantity?: number;
  label?: string;
  className?: string;
}

export default function AddToCartButton({
  product,
  quantity = 1,
  label = "Add to cart",
  className,
}: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    addToCart(product, quantity);
    showToast({
      message: `${product.title} added to cart.`,
      action: { label: "View cart", href: "/cart" },
    });
  };

  const classes =
    className ??
    "inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700";

  return (
    <button type="button" onClick={handleClick} className={classes}>
      {label}
    </button>
  );
}
