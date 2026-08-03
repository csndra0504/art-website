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
