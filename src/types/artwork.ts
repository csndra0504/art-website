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
}

export interface Artwork extends ArtworkSummary {
  description: PortableTextBlock[];
  dimensions?: string;
  forSale: boolean;
  purchaseUrl?: string;
  price?: number;
}
