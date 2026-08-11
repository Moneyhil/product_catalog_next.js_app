"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getProductById } from "@/lib/api";
import type { Product } from "@/lib/types";

interface FavoritesContextType {
  favorites: Product[];
  isSignedIn: boolean;
  addFavorite: (product: Product) => Promise<void>;
  removeFavorite: (id: number) => Promise<void>;
  isFavorite: (id: number) => boolean;
  toggleFavorite: (product: Product) => Promise<void>;
}

export const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  isSignedIn: false,
  addFavorite: async () => {},
  removeFavorite: async () => {},
  isFavorite: () => false,
  toggleFavorite: async () => {},
});

async function loadProducts(productIds: number[], knownProducts: Product[]) {
  const productsById = new Map(knownProducts.map((product) => [product.id, product]));
  const products = await Promise.all(
    productIds.map(async (productId) => {
      const knownProduct = productsById.get(productId);
      if (knownProduct) {
        return knownProduct;
      }

      try {
        return await getProductById(productId);
      } catch {
        return null;
      }
    }),
  );

  return products.filter((product): product is Product => product !== null);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("application/json")) {
    throw new Error(`Unexpected response (${response.status}): expected JSON`);
  }
  return (await response.json()) as T;
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, userId } = useAuth();
  const [favorites, setFavorites] = useState<Product[]>([]);

  useEffect(() => {
    if (!isSignedIn || !userId) {
      setFavorites([]);
      return;
    }

    let isCurrentUser = true;

    async function fetchFavorites() {
      try {
        const response = await fetch("/api/favorites");
        const { favorites: favoriteIds } = await parseJsonResponse<{
          favorites: number[];
        }>(response);
        const products = await loadProducts(favoriteIds, []);

        if (isCurrentUser) {
          setFavorites(products);
        }
      } catch (error) {
        console.error("Failed to load favorites", error);
        if (isCurrentUser) {
          setFavorites([]);
        }
      }
    }

    void fetchFavorites();

    return () => {
      isCurrentUser = false;
    };
  }, [isSignedIn, userId]);

  const updateFavorite = useCallback(
    async (product: Product, action: "add" | "remove") => {
      if (!isSignedIn || !userId) {
        return;
      }

      let previousFavorites: Product[] = [];
      setFavorites((currentFavorites) => {
        previousFavorites = currentFavorites;
        return action === "add"
          ? currentFavorites.some((item) => item.id === product.id)
            ? currentFavorites
            : [...currentFavorites, product]
          : currentFavorites.filter((item) => item.id !== product.id);
      });

      try {
        const response = await fetch("/api/favorites", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id, action }),
        });

        const { favorites: favoriteIds } = await parseJsonResponse<{
          favorites: number[];
        }>(response);
        const products = await loadProducts(favoriteIds, [...previousFavorites, product]);
        setFavorites(products);
      } catch (error) {
        console.error("Failed to update favorite", error);
        setFavorites(previousFavorites);
      }
    },
    [isSignedIn, userId],
  );

  const addFavorite = useCallback(
    async (product: Product) => updateFavorite(product, "add"),
    [updateFavorite],
  );

  const removeFavorite = useCallback(
    async (id: number) => {
      const product = favorites.find((item) => item.id === id);
      if (product) {
        await updateFavorite(product, "remove");
      }
    },
    [favorites, updateFavorite],
  );

  const toggleFavorite = useCallback(
    async (product: Product) => {
      await updateFavorite(
        product,
        favorites.some((item) => item.id === product.id) ? "remove" : "add",
      );
    },
    [favorites, updateFavorite],
  );

  const isFavorite = useCallback(
    (id: number) => favorites.some((item) => item.id === id),
    [favorites],
  );

  const value = useMemo(
    () => ({
      favorites,
      isSignedIn: Boolean(isSignedIn),
      addFavorite,
      removeFavorite,
      isFavorite,
      toggleFavorite,
    }),
    [addFavorite, favorites, isFavorite, isSignedIn, removeFavorite, toggleFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}