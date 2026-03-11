import type { SanityImageSource } from "@sanity/image-url";
import type { PortableTextBlock } from "@portabletext/react";

export interface PricingTier {
  _key: string;
  label: string;
  price: string;
  description?: string;
}

export interface CommissionsPage {
  _id: string;
  featuredImage?: {
    asset: SanityImageSource;
    alt?: string;
  };
  intro?: PortableTextBlock[];
  pricingTiers?: PricingTier[];
  framingNote?: string;
  largerFormatNote?: string;
  contactEmail: string;
}
