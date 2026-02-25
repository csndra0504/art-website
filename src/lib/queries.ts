import { client } from "./sanity";
import type { Artwork, ArtworkSummary } from "../types/artwork";

const ARTWORK_SUMMARY_PROJECTION = `{
  _id,
  title,
  slug,
  images,
  medium,
  year,
  featured,
}`;

const ARTWORK_DETAIL_PROJECTION = `{
  _id,
  title,
  slug,
  images,
  description,
  medium,
  dimensions,
  year,
  tags,
  featured,
  forSale,
  purchaseUrl,
  price,
}`;

export async function getArtworks(): Promise<ArtworkSummary[]> {
  return client.fetch(
    `*[_type == "artwork"] | order(featured desc, sortOrder asc, _createdAt desc) ${ARTWORK_SUMMARY_PROJECTION}`
  );
}

export async function getArtworkBySlug(
  slug: string
): Promise<Artwork | null> {
  return client.fetch(
    `*[_type == "artwork" && slug.current == $slug][0] ${ARTWORK_DETAIL_PROJECTION}`,
    { slug }
  );
}
