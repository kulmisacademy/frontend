"use client";

import * as React from "react";
import type { Product } from "@/lib/catalog";

export type CartLine = {
  productId: string;
  quantity: number;
  /** All lines in the cart must share the same store */
  storeId: string;
};

export type AddItemResult =
  | { ok: true }
  | { ok: false; error: "OUT_OF_STOCK" | "STORE_MISMATCH" };

export const CART_SINGLE_STORE_ERROR =
  "You can only order from one store at a time.";

type CartContextValue = {
  lines: CartLine[];
  addItem: (product: Product, quantity?: number) => AddItemResult;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  itemCount: number;
};

const CartContext = React.createContext<CartContextValue | null>(null);

const STORAGE_KEY = "laas24-cart";

function loadLines(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is CartLine =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as CartLine).productId === "string" &&
        typeof (x as CartLine).quantity === "number" &&
        (x as CartLine).quantity > 0 &&
        typeof (x as CartLine).storeId === "string"
    );
  } catch {
    return [];
  }
}

function saveLines(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = React.useState<CartLine[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setLines(loadLines());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated) saveLines(lines);
  }, [lines, hydrated]);

  const addItem = React.useCallback((product: Product, quantity = 1): AddItemResult => {
    if (!product.inStock) return { ok: false, error: "OUT_OF_STOCK" };
    let blocked = false;
    setLines((prev) => {
      if (prev.length > 0 && prev[0].storeId !== product.storeId) {
        blocked = true;
        return prev;
      }
      const i = prev.findIndex((l) => l.productId === product.id);
      if (i === -1) {
        return [
          ...prev,
          { productId: product.id, quantity, storeId: product.storeId },
        ];
      }
      const next = [...prev];
      next[i] = {
        ...next[i],
        quantity: next[i].quantity + quantity,
      };
      return next;
    });
    if (blocked) return { ok: false, error: "STORE_MISMATCH" };
    return { ok: true };
  }, []);

  const removeItem = React.useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const setQuantity = React.useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      setLines((prev) => prev.filter((l) => l.productId !== productId));
      return;
    }
    setLines((prev) => {
      const i = prev.findIndex((l) => l.productId === productId);
      if (i === -1) return prev;
      const next = [...prev];
      next[i] = { ...next[i], quantity };
      return next;
    });
  }, []);

  const clear = React.useCallback(() => setLines([]), []);

  const itemCount = React.useMemo(
    () => lines.reduce((acc, l) => acc + l.quantity, 0),
    [lines]
  );

  const value = React.useMemo(
    () => ({
      lines,
      addItem,
      removeItem,
      setQuantity,
      clear,
      itemCount,
    }),
    [lines, addItem, removeItem, setQuantity, clear, itemCount]
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
