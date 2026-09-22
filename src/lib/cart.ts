import type { ShippingType } from "../types/artwork";

// Cart state as pure data + pure functions. No React, no localStorage access —
// the context layer owns both, which keeps this file trivially testable and,
// more importantly, safe to import from anywhere including the SSG build.
//
// Prices carried on a line are a display-only snapshot. The checkout server
// re-reads price and stock from the catalog before charging anyone, so nothing
// here is trusted with money.

export const CART_STORAGE_KEY = "cassart.cart";

/** sessionStorage: the order this tab just left for Square to pay. */
export const PENDING_ORDER_KEY = "cassart.pendingOrder";

/** localStorage: order ids whose purchase has been recorded, so a refresh of
 *  the success page can't count the same revenue twice. */
export const TRACKED_ORDERS_KEY = "cassart.trackedOrders";

// Bump when the shape of CartLine changes. A stored cart at any other version is
// discarded rather than migrated: a stale cart is a minor annoyance, but a
// half-understood one that crashes the drawer costs a sale.
// v2: lines keyed by product rather than artwork + option (product model).
export const CART_VERSION = 2;

export interface CartLine {
  /**
   * Sanity _id of the product. One id per sellable thing, mapping 1:1 to a
   * Square variation — the old artwork + option-key pair couldn't address the
   * hardcoded purchase fields, which had no key at all.
   */
  productId: string;
  qty: number;
  /** Locks qty to 1. Originals are the obvious case. */
  oneOfAKind?: boolean;
  // Display-only snapshot, so the drawer renders without refetching every
  // artwork. Re-validated server-side at checkout.
  slug: string;
  title: string;
  optionTitle: string;
  price: number;
  image?: string;
  /**
   * Lets the drawer preview postage. Display-only like the price: the checkout
   * server recomputes shipping from its own read of the product. Optional, so a
   * line saved before this existed just shows "calculated at checkout".
   */
  shippingType?: ShippingType | null;
}

export interface Cart {
  v: number;
  lines: CartLine[];
}

export function emptyCart(): Cart {
  return { v: CART_VERSION, lines: [] };
}

/** Identity of a line: one product. */
export function lineId(line: Pick<CartLine, "productId">): string {
  return line.productId;
}

function clampQty(line: CartLine, qty: number): number {
  const floored = Math.max(0, Math.floor(qty));
  return line.oneOfAKind ? Math.min(1, floored) : floored;
}

export function addLine(cart: Cart, line: CartLine, qty = 1): Cart {
  const id = lineId(line);
  const existing = cart.lines.find((l) => lineId(l) === id);
  if (existing) {
    return setQty(cart, id, existing.qty + qty);
  }
  const added = { ...line, qty: clampQty(line, qty) };
  if (added.qty === 0) return cart;
  return { ...cart, lines: [...cart.lines, added] };
}

export function removeLine(cart: Cart, id: string): Cart {
  return { ...cart, lines: cart.lines.filter((l) => lineId(l) !== id) };
}

/** Setting a quantity of zero (or less) removes the line. */
export function setQty(cart: Cart, id: string, qty: number): Cart {
  const lines = cart.lines.flatMap((l) => {
    if (lineId(l) !== id) return [l];
    const next = clampQty(l, qty);
    return next === 0 ? [] : [{ ...l, qty: next }];
  });
  return { ...cart, lines };
}

export function clearLines(cart: Cart): Cart {
  return { ...cart, lines: [] };
}

export function subtotal(cart: Cart): number {
  return cart.lines.reduce((sum, l) => sum + l.price * l.qty, 0);
}

export function itemCount(cart: Cart): number {
  return cart.lines.reduce((sum, l) => sum + l.qty, 0);
}

// --- persistence helpers -----------------------------------------------------
// Parsing is defensive because the input is whatever happens to be in a
// visitor's browser: another site's key collision, a half-written value, or a
// cart written by a previous version of this code.

export function parseCart(raw: string | null): Cart {
  if (!raw) return emptyCart();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as Cart).v !== CART_VERSION ||
      !Array.isArray((parsed as Cart).lines)
    ) {
      return emptyCart();
    }
    const lines = (parsed as Cart).lines.filter(isCartLine);
    return { v: CART_VERSION, lines };
  } catch {
    return emptyCart();
  }
}

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const l = value as CartLine;
  return (
    typeof l.productId === "string" &&
    typeof l.slug === "string" &&
    typeof l.title === "string" &&
    typeof l.optionTitle === "string" &&
    typeof l.price === "number" &&
    Number.isFinite(l.price) &&
    typeof l.qty === "number" &&
    Number.isFinite(l.qty) &&
    l.qty > 0
  );
}

export function serializeCart(cart: Cart): string {
  return JSON.stringify(cart);
}

// --- reconciliation ----------------------------------------------------------

/** What a line looks like now, per the catalog. */
export type LineCheck =
  | { status: "ok"; fresh: Pick<CartLine, "title" | "optionTitle" | "price" | "shippingType"> }
  | { status: "gone" | "soldOut" }
  /** Not part of this check (added after it started); left exactly as it is. */
  | { status: "unchecked" };

export interface CartNotice {
  title: string;
  optionTitle: string;
  change: "soldOut" | "gone" | "price";
  /** For "price": the new unit price. */
  price?: number;
}

export interface ReconcileResult {
  cart: Cart;
  /** What changed, so the UI can say so rather than silently shrinking or repricing. */
  notices: CartNotice[];
}

// Takes a resolver rather than fetching anything itself, which keeps this pure:
// the provider does the fetching, and this decides what the answer means.
export function reconcileCart(
  cart: Cart,
  resolve: (line: CartLine) => LineCheck,
): ReconcileResult {
  const notices: CartNotice[] = [];
  let changed = false;
  const lines = cart.lines.flatMap((line) => {
    const check = resolve(line);
    if (check.status === "unchecked") return [line];
    if (check.status !== "ok") {
      changed = true;
      notices.push({ title: line.title, optionTitle: line.optionTitle, change: check.status });
      return [];
    }
    const next = { ...line, ...check.fresh };
    if (next.price !== line.price) {
      notices.push({ title: next.title, optionTitle: next.optionTitle, change: "price", price: next.price });
    }
    const same = (Object.keys(check.fresh) as (keyof typeof check.fresh)[]).every(
      (k) => next[k] === line[k],
    );
    if (same) return [line];
    changed = true;
    return [next];
  });
  return { cart: changed ? { ...cart, lines } : cart, notices };
}
