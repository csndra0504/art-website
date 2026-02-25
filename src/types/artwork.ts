import type { SanityImageSource } from "@sanity/image-url";

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
  featured?: boolean;
}

export interface Artwork extends ArtworkSummary {
  description: unknown[];
  dimensions?: string;
  tags?: string[];
  forSale: boolean;
  purchaseUrl?: string;
  price?: number;
}
