import type { SanityImageSource } from "@sanity/image-url";
import type { PortableTextBlock } from "@portabletext/react";

export interface ArtworkImage {
  _key: string;
  asset: SanityImageSource;
  alt: string;
}

export interface ArtworkSummary {
  _id: string;
  title: string;
  slug: { current: string };
  images: ArtworkImage[];
  medium: string;
  year?: number;
  tags?: string[];
  featured?: boolean;
  forSale?: boolean;
  highlightLabel?: string;
  // Visible products, joined in so cards can show prices without a fetch.
  // Interpret them through lib/offers.ts rather than reading them directly.
  products?: SubjectProduct[] | null;
  // The Etsy link stays on the subject: a fallback, not a product.
  printEtsyUrl?: string;
  printEtsyPrice?: number;
}

// --- products ---------------------------------------------------------------
// A product is one sellable thing, referencing an artwork ("Subject") for its
// images and story. One subject can back several products — three separate
// originals of the same scene, say — which the legacy fields below cannot
// represent. Maps 1:1 to a Square catalog variation.
// See docs/cart-checkout/product-model-migration.md.

/**
 * What a product physically is. Only "print" and "postcard" suppress the
 * "want this as a print?" prompt; anything added here defaults to not
 * suppressing it, so a new format can't silently kill the demand signal.
 *
 * The gallery card shows the cheapest visible non-original product as
 * "From $X" regardless of format — there is deliberately no per-format
 * pricing rule to keep in sync.
 */
export type ProductKind =
  | "original"
  | "print"
  | "postcard"
  | "magnet"
  | "sticker"
  | "other";

export type ProductChannel = "local" | "etsy";

/** Framed bands by packed weight (≤20 oz / >20 oz), not by frame contents. */
export type ShippingType =
  | "magnet"
  | "postcard"
  | "print"
  | "original"
  | "framedSmall"
  | "framedLarge";

export interface Product {
  _id: string;
  title: string;
  kind: ProductKind;
  price: number;
  quantity?: number;
  /** Mirrored from Square by webhook — never hand-edited. */
  soldOut?: boolean;
  channel: ProductChannel;
  /** Set when channel is "etsy". Those products link out and never enter the cart. */
  etsyUrl?: string;
  subtitle?: string;
  visible?: boolean;
  sortOrder?: number;
  shippingType?: ShippingType;
  shipWeightOz?: number;
  shipLengthIn?: number;
  shipWidthIn?: number;
  shipHeightIn?: number;
  /** Without this the product can't be sold — Square only tracks stock for catalog line items. */
  squareVariationId?: string;
  /** Legacy one-off checkout link, retired once the cart is live. */
  squareUrl?: string;
  venmoNote?: string;
}

/** The product fields the site reads, joined onto each subject by the queries. */
export type SubjectProduct = Pick<
  Product,
  "_id" | "title" | "kind" | "price" | "soldOut" | "subtitle" | "shippingType"
>;

/** A product joined with the subject fields the cart and detail page need. */
export interface ProductWithSubject extends Product {
  subject: {
    _id: string;
    title: string;
    slug: { current: string };
    images?: ArtworkImage[];
  };
}

// --- legacy purchase model --------------------------------------------------
// Everything below is superseded by Product and removed once the read path is
// proven. Do not build anything new on it.

export type CustomPurchaseKind = "original" | "print";

export interface CustomPurchaseOption {
  _key: string;
  title: string;
  price: number;
  subtitle?: string;
  visible?: boolean;
  squareUrl?: string;
  // When set, the option renders an "Order Print" button linking to Etsy
  // instead of the Square/Venmo buttons. Pair with a "Ships via Etsy" subtitle.
  etsyUrl?: string;
  // Overrides the auto-generated Venmo note. Used for options like a postcard
  // bundle where the buyer needs to tell us which designs they want.
  venmoNote?: string;
  // What this option sells. A visible "print" option suppresses the
  // "request a print" prompt, since a print is already available.
  kind?: CustomPurchaseKind;
}

export interface Artwork extends ArtworkSummary {
  description: PortableTextBlock[];
  dimensions?: string;
  forSale: boolean;
  originalPrice?: number;
  originalSold?: boolean;
  originalSquareUrl?: string;
  printEtsyUrl?: string;
  printEtsyPrice?: number;
  printLocalPrice?: number;
  printLocalSold?: boolean;
  customOptions?: CustomPurchaseOption[];
}
