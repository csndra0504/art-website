import type { SanityImageSource } from "@sanity/image-url";

export interface ArtworkSummary {
  _id: string;
  title: string;
  slug: { current: string };
  image: SanityImageSource & { alt?: string };
  medium?: string;
  year?: number;
}

export interface Artwork extends ArtworkSummary {
  description?: string;
  dimensions?: string;
  tags?: string[];
}
