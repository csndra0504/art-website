import type { PortableTextBlock, SanityImageSource } from "@portabletext/react";

export interface EventPhoto {
  _key: string;
  asset: SanityImageSource;
  alt?: string;
}

export interface Event {
  _id: string;
  title: string;
  date: string;
  description?: PortableTextBlock[];
  photos?: EventPhoto[];
  link?: string;
}
