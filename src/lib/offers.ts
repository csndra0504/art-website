// What a subject offers for sale, derived from its products. One module so the
// gallery card, the home page's "For Sale" filter, the detail page and the
// JSON-LD all answer "what can I buy here, and from what price?" the same way —
// they used to each read the legacy purchase fields with slightly different
// rules. See docs/cart-checkout/product-model-migration.md.

import type { Product, SubjectProduct } from "../types/artwork";

export interface OfferSource {
  forSale?: boolean;
  products?: SubjectProduct[] | null;
  printEtsyUrl?: string;
  printEtsyPrice?: number;
}

// Formats that satisfy someone asking for a print. A magnet doesn't, so it
// mustn't switch the "want this as a print?" prompt off — and anything added to
// the format list later defaults to not switching it off either.
const PRINT_LIKE = new Set<Product["kind"]>(["print", "postcard"]);

const cheapest = (ps: SubjectProduct[]) =>
  ps.length ? ps.reduce((a, b) => (b.price < a.price ? b : a)) : undefined;

export function offersFor(s: OfferSource) {
  const products = s.products ?? [];
  const originals = products.filter((p) => p.kind === "original");
  const others = products.filter((p) => p.kind !== "original");
  const availableOriginals = originals.filter((p) => !p.soldOut);
  const availableOthers = others.filter((p) => !p.soldOut);

  // Etsy is the fallback for pieces with nothing on hand, not a parallel option:
  // the button appears only when no non-original product can be bought here.
  // When the last local print sells out, it comes back on its own.
  const showEtsy = !!s.printEtsyUrl && availableOthers.length === 0;

  // The original shown on the card: the cheapest one still for sale, or — if
  // every original has sold — one of them, so the card can say "Sold".
  const original = cheapest(availableOriginals) ?? originals[0];

  // "From $X" is the cheapest thing that isn't an original, whatever its
  // format — deliberately no per-format rule to keep in sync (plan §8).
  const fromProduct = cheapest(availableOthers);
  const fromPrice =
    fromProduct?.price ?? (showEtsy && s.printEtsyPrice != null ? s.printEtsyPrice : null);

  const anyAvailable =
    availableOriginals.length > 0 || availableOthers.length > 0 || showEtsy;
  const everListed = products.length > 0 || !!s.printEtsyUrl;

  return {
    products,
    original,
    originalSold: !!original && availableOriginals.length === 0,
    fromPrice,
    showEtsy,
    anyAvailable,
    /** Listed at some point, but nothing can be bought now. */
    soldOut: everListed && !anyAvailable,
    /** Whether a print exists here, sold or not — hides the "request a print" prompt. */
    hasPrint: !!s.printEtsyUrl || products.some((p) => PRINT_LIKE.has(p.kind)),
  };
}

/** For the home page's "For Sale" filter. */
export function isAvailable(s: OfferSource): boolean {
  return !!s.forSale && offersFor(s).anyAvailable;
}
