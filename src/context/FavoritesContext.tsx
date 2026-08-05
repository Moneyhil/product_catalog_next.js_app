"use client";

import {
  createContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import type { Product } from "@/lib/types";

interface FavoritesContextType {
  favorites: Product[];
  addFavorite: (product: Product) => void;
  removeFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
  toggleFavorite: (product: Product) => void;
}

export const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  addFavorite: () => {},
  removeFavorite: () => {},
  isFavorite: () => false,
  toggleFavorite: () => {},
});

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Product[]>([]);

  useEffect(() => {
    try {
      const storedFavorites = window.localStorage.getItem("favorites");
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error("Failed to load favorites from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("favorites", JSON.stringify(favorites));
    } catch (error) {
      console.error("Failed to save favorites to localStorage", error);
    }
  }, [favorites]);

  const addFavorite = (product: Product) => {
    setFavorites((currentFavorites) => {
      if (currentFavorites.some((item) => item.id === product.id)) {
        return currentFavorites;
      }
      return [...currentFavorites, product];
    });
  };

  const removeFavorite = (id: number) => {
    setFavorites((currentFavorites) =>
      currentFavorites.filter((item) => item.id !== id)
    );
  };

  const isFavorite = (id: number) =>
    favorites.some((item) => item.id === id);

  const toggleFavorite = (product: Product) => {
    setFavorites((currentFavorites) => {
      const isAlreadyFavorite = currentFavorites.some(
        (item) => item.id === product.id
      );
      if (isAlreadyFavorite) {
        return currentFavorites.filter((item) => item.id !== product.id);
      }
      return [...currentFavorites, product];
    });
  };

  const value = useMemo(
    () => ({ favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite }),
    [favorites]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}