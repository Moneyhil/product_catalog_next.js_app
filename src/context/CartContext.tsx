"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CartItem, Product } from "@/lib/types";

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  total: number;
  isLoaded: boolean;
  isSignedIn: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (id: number) => void;
  increaseQuantity: (id: number) => void;
  decreaseQuantity: (id: number) => void;
  setQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextType>({
  items: [],
  itemCount: 0,
  total: 0,
  isLoaded: false,
  isSignedIn: false,
  addToCart: () => {},
  removeFromCart: () => {},
  increaseQuantity: () => {},
  decreaseQuantity: () => {},
  setQuantity: () => {},
  clearCart: () => {},
});

const GUEST_STORAGE_KEY = "cart";

function readLocalCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is CartItem => {
      if (!entry || typeof entry !== "object") return false;
      const candidate = entry as Record<string, unknown>;
      return (
        Number.isInteger(candidate.id) &&
        typeof candidate.title === "string" &&
        typeof candidate.price === "number" &&
        typeof candidate.image === "string" &&
        Number.isInteger(candidate.quantity) &&
        (candidate.quantity as number) >= 1
      );
    });
  } catch {
    return [];
  }
}

function writeLocalCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(items));
}

function clearLocalCart() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_STORAGE_KEY);
}

function cartToItems(items: CartItem[]): Map<number, CartItem> {
  return new Map(items.map((item) => [item.id, { ...item }]));
}

function sumQuantities(a: CartItem[], b: CartItem[]): CartItem[] {
  const merged = cartToItems(a);
  for (const item of b) {
    const existing = merged.get(item.id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.set(item.id, { ...item });
    }
  }
  return Array.from(merged.values());
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("application/json")) {
    throw new Error(`Unexpected response (${response.status}): expected JSON`);
  }
  return (await response.json()) as T;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, userId } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveInFlightRef = useRef(false);
  const pendingLocalRef = useRef<CartItem[] | null>(null);
  const loadedIdentityRef = useRef<string | null>(null);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const fetchRemoteCart = useCallback(async () => {
    try {
      const response = await fetch("/api/cart");
      const { items } = await parseJsonResponse<{ items: CartItem[] }>(response);
      return Array.isArray(items) ? items : [];
    } catch (error) {
      console.error("Failed to load remote cart", error);
      return [];
    }
  }, []);

  async function saveRemoteCart(next: CartItem[]) {
    saveInFlightRef.current = true;
    try {
      const response = await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: next }),
      });
      const { items } = await parseJsonResponse<{ items: CartItem[] }>(response);
      if (Array.isArray(items)) {
        setItems(items);
      }
    } catch (error) {
      console.error("Failed to save remote cart", error);
    } finally {
      saveInFlightRef.current = false;
      const pending = pendingLocalRef.current;
      pendingLocalRef.current = null;
      if (pending) {
        void saveRemoteCart(pending);
      }
    }
  }

  const commitChanges = useCallback(
    (next: CartItem[]) => {
      setItems(next);
      if (isSignedIn) {
        if (saveInFlightRef.current) {
          pendingLocalRef.current = next;
        } else {
          void saveRemoteCart(next);
        }
      } else {
        writeLocalCart(next);
      }
    },
    [isSignedIn],
  );

  useEffect(() => {
    const identity = isSignedIn && userId ? `signed-in:${userId}` : "signed-out";
    const identityChanged = loadedIdentityRef.current !== identity;

    let cancelled = false;

    async function loadSignedInCart() {
      const localCart = readLocalCart();
      const remoteCart = await fetchRemoteCart();
      if (cancelled) return;

      if (localCart.length === 0) {
        setItems(remoteCart);
      } else {
        const merged = sumQuantities(remoteCart, localCart);
        setItems(merged);
        clearLocalCart();
        void saveRemoteCart(merged);
      }
      loadedIdentityRef.current = identity;
      setIsLoaded(true);
    }

    function loadSignedOutCart() {
      const nextItems = readLocalCart();
      queueMicrotask(() => {
        if (cancelled) return;
        setItems(nextItems);
        loadedIdentityRef.current = identity;
        setIsLoaded(true);
      });
    }

    if (identityChanged) {
      loadedIdentityRef.current = identity;
    }

    if (isSignedIn && userId) {
      void loadSignedInCart();
    } else {
      loadSignedOutCart();
    }

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId, fetchRemoteCart]);

  const addToCart = useCallback(
    (product: Product, quantity = 1) => {
      if (!Number.isInteger(quantity) || quantity < 1) return;
      const next = [...items];
      const index = next.findIndex((item) => item.id === product.id);

      if (index >= 0) {
        next[index] = {
          ...next[index],
          quantity: next[index].quantity + quantity,
        };
      } else {
        next.push({
          id: product.id,
          title: product.title,
          price: product.price,
          image: product.image,
          quantity,
        });
      }

      commitChanges(next);
    },
    [items, commitChanges],
  );

  const removeFromCart = useCallback(
    (id: number) => {
      commitChanges(items.filter((item) => item.id !== id));
    },
    [items, commitChanges],
  );

  const increaseQuantity = useCallback(
    (id: number) => {
      const next = items.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
      );
      commitChanges(next);
    },
    [items, commitChanges],
  );

  const decreaseQuantity = useCallback(
    (id: number) => {
      const next = items
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item,
        )
        .filter((item) => item.quantity >= 1);
      commitChanges(next);
    },
    [items, commitChanges],
  );

  const setQuantity = useCallback(
    (id: number, quantity: number) => {
      if (!Number.isInteger(quantity) || quantity < 1) {
        removeFromCart(id);
        return;
      }
      const next = items
        .map((item) => (item.id === id ? { ...item, quantity } : item))
        .filter((item) => item.quantity >= 1);
      commitChanges(next);
    },
    [items, commitChanges, removeFromCart],
  );

  const clearCart = useCallback(() => {
    commitChanges([]);
  }, [commitChanges]);

  const value = useMemo(
    () => ({
      items,
      itemCount,
      total,
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      addToCart,
      removeFromCart,
      increaseQuantity,
      decreaseQuantity,
      setQuantity,
      clearCart,
    }),
    [
      items,
      itemCount,
      total,
      isLoaded,
      isSignedIn,
      addToCart,
      removeFromCart,
      increaseQuantity,
      decreaseQuantity,
      setQuantity,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
