import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CART_STORAGE_KEY,
  addLine,
  clearLines,
  lineId,
  emptyCart,
  itemCount,
  parseCart,
  reconcileCart,
  removeLine,
  serializeCart,
  setQty,
  subtotal,
  type Cart,
  type CartLine,
  type CartNotice,
  type LineCheck,
} from "../lib/cart";
import { getCartProducts } from "../lib/queries";
import { CartContext, type CartContextValue } from "../lib/cartContext";
import { trackAddToCart, trackRemoveFromCart, type AnalyticsItem } from "../lib/analytics";

const asItem = (line: CartLine, quantity: number): AnalyticsItem => ({
  item_id: line.slug,
  item_name: line.title,
  item_variant: line.optionTitle,
  price: line.price,
  quantity,
});

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

  // Analytics compare against the latest cart here, outside the state updater:
  // React may run an updater twice in development, which would double-count.
  const latest = useRef(cart);
  useEffect(() => {
    latest.current = cart;
  }, [cart]);

  // Only a real change is tracked. Adding an original that's already in the
  // cart, or stepping past 1 on one, changes nothing and records nothing.
  const trackChange = useCallback((before: CartLine | undefined, after: Cart, id: string) => {
    const now = after.lines.find((l) => lineId(l) === id);
    const delta = (now?.qty ?? 0) - (before?.qty ?? 0);
    const line = now ?? before;
    if (!line || delta === 0) return;
    if (delta > 0) trackAddToCart(asItem(line, delta));
    else trackRemoveFromCart(asItem(line, -delta));
  }, []);

  const add = useCallback(
    (line: CartLine, qty = 1) => {
      const id = lineId(line);
      const before = latest.current.lines.find((l) => lineId(l) === id);
      trackChange(before, addLine(latest.current, line, qty), id);
      setCart((c) => addLine(c, line, qty));
    },
    [trackChange],
  );

  const remove = useCallback(
    (id: string) => {
      const before = latest.current.lines.find((l) => lineId(l) === id);
      trackChange(before, removeLine(latest.current, id), id);
      setCart((c) => removeLine(c, id));
    },
    [trackChange],
  );

  const setLineQty = useCallback(
    (id: string, qty: number) => {
      const before = latest.current.lines.find((l) => lineId(l) === id);
      trackChange(before, setQty(latest.current, id, qty), id);
      setCart((c) => setQty(c, id, qty));
    },
    [trackChange],
  );

  const clear = useCallback(() => {
    setCart(clearLines);
  }, []);

  // A saved cart can outlive what's in it: a piece sells at a market, a price
  // changes, a page is retired. Check it against the published catalog so the
  // cart says so before checkout does. If the check can't run (offline, Sanity
  // down), the cart is left alone — the checkout server re-checks everything.
  const [notices, setNotices] = useState<CartNotice[]>([]);
  const lastCheck = useRef(0);
  const refresh = useCallback(() => {
    const ids = latest.current.lines.map(lineId);
    if (ids.length === 0 || Date.now() - lastCheck.current < 60_000) return;
    lastCheck.current = Date.now();
    getCartProducts(ids)
      .then((products) => {
        const byId = new Map(products.map((p) => [p._id, p]));
        const resolve = (line: CartLine): LineCheck => {
          if (!ids.includes(lineId(line))) return { status: "unchecked" };
          const p = byId.get(lineId(line));
          if (!p || p.visible === false || !p.subjectTitle) return { status: "gone" };
          if (p.soldOut) return { status: "soldOut" };
          return {
            status: "ok",
            fresh: {
              title: p.subjectTitle,
              optionTitle: p.title,
              price: p.price,
              shippingType: p.shippingType ?? line.shippingType,
            },
          };
        };
        // Notices from the latest cart; the update itself re-runs against
        // whatever the cart is by then, so a line added meanwhile survives.
        const found = reconcileCart(latest.current, resolve).notices;
        setCart((c) => reconcileCart(c, resolve).cart);
        if (found.length) setNotices((n) => [...n, ...found]);
      })
      .catch(() => {
        // Let the next open try again.
        lastCheck.current = 0;
      });
  }, []);

  useEffect(() => {
    if (ready) refresh();
  }, [ready, refresh]);

  const dismissNotices = useCallback(() => setNotices([]), []);

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
      notices,
      dismissNotices,
      refresh,
    }),
    [cart, ready, add, remove, setLineQty, clear, notices, dismissNotices, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
