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
  // Pricing carried on the summary so cards can show "from $X" without a fetch.
  originalPrice?: number;
  originalSold?: boolean;
  printEtsyPrice?: number;
  printLocalPrice?: number;
  printLocalSold?: boolean;
  // True when the piece has at least one visible custom purchase option, so the
  // gallery's "For Sale" filter counts options-only pieces (e.g. postcards).
  hasCustomOption?: boolean;
  // Cheapest visible custom option of kind "print", so the card's "Prints from"
  // line reflects print-type custom options (e.g. postcards).
  customPrintFrom?: number;
}

// --- products ---------------------------------------------------------------
// A product is one sellable thing, referencing an artwork ("Subject") for its
// images and story. One subject can back several products — three separate
// originals of the same scene, say — which the legacy fields below cannot
// represent. Maps 1:1 to a Square catalog variation.
// See docs/cart-checkout/product-model-migration.md.

export type ProductKind = "original" | "print";

export type ProductChannel = "local" | "etsy";

/** Framed bands by packed weight (≤16 oz / >16 oz), not by frame contents. */
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
