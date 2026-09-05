import { createContext, useContext } from "react";
import type { Cart, CartLine } from "./cart";

// Context and hook live apart from the provider component: a module that
// exports both a component and a hook breaks Fast Refresh, and eslint enforces
// it. The provider is in components/CartProvider.tsx.

export interface CartContextValue {
  cart: Cart;
  lines: CartLine[];
  count: number;
  total: number;
  /** False until the stored cart has been read. See the hydration note in CartProvider. */
  ready: boolean;
  add: (line: CartLine, qty?: number) => void;
  remove: (id: string) => void;
  setLineQty: (id: string, qty: number) => void;
  clear: () => void;
  replace: (cart: Cart) => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
