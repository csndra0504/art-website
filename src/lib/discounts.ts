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

// Second multi-buy: any two stickers for $5. Stickers ship in the magnet band,
// which magnets share, so the band can't be the eligibility test here — the
// product's format is.
export const STICKER_DEAL = {
  name: "Any 2 stickers for $5",
  size: 2,
  priceCents: 500,
} as const;

export const isSticker = (kind?: string | null) => kind === "sticker";

export interface DiscountableLine {
  shippingType?: ShippingType | null;
  /** Product format. Only the sticker deal reads it. */
  kind?: string | null;
  qty: number;
  unitCents: number;
}

// Groups the priciest eligible units first so a buyer never loses by the
// grouping; leftovers pay full price, and a group already cheaper than the deal
// gets nothing rather than a surcharge.
function groupDiscountCents(unitCents: number[], size: number, priceCents: number): number {
  const units = [...unitCents].sort((a, b) => b - a);
  let off = 0;
  for (let g = 0; g < Math.floor(units.length / size); g++) {
    const group = units.slice(g * size, (g + 1) * size);
    off += Math.max(0, group.reduce((s, c) => s + c, 0) - priceCents);
  }
  return off;
}

const unitsOf = (lines: DiscountableLine[], eligible: (l: DiscountableLine) => boolean) =>
  lines.filter(eligible).flatMap((l) => Array<number>(Math.max(0, l.qty)).fill(l.unitCents));

/** Cents off the order from the 3-for-$25 print deal. */
export function bundleDiscountCents(lines: DiscountableLine[]): number {
  return groupDiscountCents(
    unitsOf(lines, (l) => inBundle(l.shippingType)),
    BUNDLE.size,
    BUNDLE.priceCents
  );
}

/** Cents off the order from the 2-for-$5 sticker deal. */
export function stickerDiscountCents(lines: DiscountableLine[]): number {
  return groupDiscountCents(
    unitsOf(lines, (l) => isSticker(l.kind)),
    STICKER_DEAL.size,
    STICKER_DEAL.priceCents
  );
}
