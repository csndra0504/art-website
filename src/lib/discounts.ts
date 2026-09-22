// Multi-buy deal: any three 5x7 prints for $25. Replaced the single "Any 3
// postcards" product when each design became its own product, so stock is
// counted per design and the deal still applies to any mix.
//
// Pure and shared, like shipping.ts: the checkout server applies it to the
// Square order (authoritative), the cart drawer previews it. Web only — Square
// has no matching automatic discount, so at markets it's still applied by hand.

// Explicit ".ts": the checkout server imports this file too (see shipping.ts).
import type { ShippingType } from "../types/artwork.ts";

export const BUNDLE = {
  name: "Any 3 5x7 prints for $25",
  size: 3,
  priceCents: 2500,
} as const;

// Every 5x7 print ships in the postcard band, and nothing else does, so the band
// doubles as the eligibility test. If something non-5x7 is ever put in that
// band, this needs its own flag.
export const inBundle = (shippingType?: ShippingType | null) => shippingType === "postcard";

export interface DiscountableLine {
  shippingType?: ShippingType | null;
  qty: number;
  unitCents: number;
}

/**
 * Cents off the order. Each full group of three eligible units costs $25; the
 * priciest units are grouped first so a buyer never loses by the grouping, and
 * leftovers pay full price (4 prints = $25 + $10).
 */
export function bundleDiscountCents(lines: DiscountableLine[]): number {
  const units = lines
    .filter((l) => inBundle(l.shippingType))
    .flatMap((l) => Array<number>(Math.max(0, l.qty)).fill(l.unitCents))
    .sort((a, b) => b - a);

  const groups = Math.floor(units.length / BUNDLE.size);
  let off = 0;
  for (let g = 0; g < groups; g++) {
    const group = units.slice(g * BUNDLE.size, (g + 1) * BUNDLE.size);
    // A group already cheaper than the deal gets nothing, never a surcharge.
    off += Math.max(0, group.reduce((s, c) => s + c, 0) - BUNDLE.priceCents);
  }
  return off;
}
