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
}

export interface CustomPurchaseOption {
  _key: string;
  title: string;
  price: number;
  subtitle?: string;
  visible?: boolean;
  squareUrl?: string;
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
