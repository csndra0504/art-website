// Shipping charge for an order, from the products in it. The one piece of money
// logic this site owns outright — Square just displays the number we hand it —
// so it's a pure function with no I/O, shared by the checkout server (which is
// authoritative) and anything on the client that wants to preview it.
// Rules and rates: docs/cart-checkout/PRD.md §9.

import type { ShippingType } from "../types/artwork";

/**
 * Cassandra's estimates, 2026-09-05. Not label-verified — CAS-30 tracks that,
 * and it gates go-live. In cents, because money in floats drifts.
 */
export const SHIPPING_RATES_CENTS: Record<ShippingType, number> = {
  magnet: 200,
  postcard: 300,
  print: 500,
  original: 1000,
  framedSmall: 1000,
  framedLarge: 2000,
};

// Framed pieces each need their own box. Everything else is flat and nests in a
// single mailer with whatever else is in the order.
const BOXED = new Set<ShippingType>(["framedSmall", "framedLarge"]);

export type FulfillmentMethod = "ship" | "pickup";

export interface ShippableLine {
  shippingType?: ShippingType | null;
  qty: number;
  /** For the error message only. */
  title?: string;
}

// Written without parameter properties so Node can run this file directly with
// type stripping — the checkout server shares it.
export class MissingShippingTypeError extends Error {
  readonly titles: string[];
  constructor(titles: string[]) {
    super(`No shipping type for: ${titles.join(", ")}`);
    this.name = "MissingShippingTypeError";
    this.titles = titles;
  }
}

/**
 * shipping = sum(boxed items, per unit)
 *          + (any boxed item present ? 0 : highest flat rate present)
 *
 * - Boxed items are charged per unit: two framed originals are two boxes.
 * - Flat items collapse to the single highest flat rate: a magnet and a print
 *   share one mailer sized for the print.
 * - Flat is waived entirely when anything boxed is present — small flat items
 *   ride along in the box.
 * - Local pickup is always free.
 *
 * A line with no shipping type throws rather than counting as free. Charging $0
 * for postage we then have to pay is the failure this guards against; an
 * unshippable cart is visible, a silently free one isn't.
 */
export function shippingCents(
  lines: ShippableLine[],
  method: FulfillmentMethod
): number {
  if (method === "pickup") return 0;

  const live = lines.filter((l) => l.qty > 0);
  const missing = live.filter((l) => !l.shippingType);
  if (missing.length) {
    throw new MissingShippingTypeError(missing.map((l) => l.title ?? "(untitled)"));
  }

  let boxedCents = 0;
  let highestFlat = 0;
  for (const l of live) {
    const type = l.shippingType as ShippingType;
    const rate = SHIPPING_RATES_CENTS[type];
    if (BOXED.has(type)) boxedCents += rate * l.qty;
    else highestFlat = Math.max(highestFlat, rate);
  }

  return boxedCents > 0 ? boxedCents : highestFlat;
}
