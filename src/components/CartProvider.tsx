import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CART_STORAGE_KEY,
  addLine,
  clearLines,
  emptyCart,
  itemCount,
  parseCart,
  removeLine,
  serializeCart,
  setQty,
  subtotal,
  type Cart,
  type CartLine,
} from "../lib/cart";
import { CartContext, type CartContextValue } from "../lib/cartContext";

// The cart starts empty on every render path, including the client's first one.
// Reading localStorage during render would produce markup that doesn't match the
// prerendered HTML — and this site prerenders every route — so we hydrate in an
// effect and let consumers key off `ready`. That's also why the header badge
// hides at zero: for one frame after load, every visitor's cart looks empty.
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCart(parseCart(window.localStorage.getItem(CART_STORAGE_KEY)));
    } catch {
      // Private mode and blocked-storage settings throw on access rather than
      // returning null. An in-memory cart for the session beats a page that
      // won't render.
    } finally {
      setReady(true);
    }
  }, []);

  // Skip the first pass so a not-yet-read store isn't overwritten with the empty
  // initial state.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!ready) return;
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(cart));
    } catch {
      // Quota or blocked storage. The cart still works for this session.
    }
  }, [cart, ready]);

  const add = useCallback((line: CartLine, qty = 1) => {
    setCart((c) => addLine(c, line, qty));
  }, []);

  const remove = useCallback((id: string) => {
    setCart((c) => removeLine(c, id));
  }, []);

  const setLineQty = useCallback((id: string, qty: number) => {
    setCart((c) => setQty(c, id, qty));
  }, []);

  const clear = useCallback(() => {
    setCart(clearLines);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      lines: cart.lines,
      count: itemCount(cart),
      total: subtotal(cart),
      ready,
      add,
      remove,
      setLineQty,
      clear,
      replace: setCart,
    }),
    [cart, ready, add, remove, setLineQty, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
