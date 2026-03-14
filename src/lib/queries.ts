import { client } from "./sanity";
import type { Artwork, ArtworkSummary } from "../types/artwork";
import type { Event } from "../types/event";


const ARTWORK_SUMMARY_PROJECTION = `{
  _id,
  title,
  slug,
  images,
  medium,
  year,
  tags,
  featured,
  forSale,
  sortOrder,
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
    `*[_type == "artwork"] | order(coalesce(featured, false) desc, coalesce(sortOrder, 9999) asc, _createdAt desc) ${ARTWORK_SUMMARY_PROJECTION}`
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

export async function getEvents(): Promise<Event[]> {
  return client.fetch(
    `*[_type == "event"] | order(date desc) {
      _id,
      title,
      date,
      description,
      photos,
      link,
    }`
  );
}

export async function getUpcomingEvents(): Promise<Event[]> {
  return client.fetch(
    `*[_type == "event" && date >= now()] | order(date asc) {
      _id,
      title,
      date,
      link,
    }`
  );
}
