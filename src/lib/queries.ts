import { client } from "./sanity";
import type { Artwork, ArtworkSummary } from "../types/artwork";
import type { Event } from "../types/event";


// What's for sale comes from the subject's product documents, not from fields on
// the artwork. The Etsy link stays on the subject: it isn't a product, just the
// fallback shown when nothing local is for sale (see lib/offers.ts).
const PRODUCTS_JOIN = `
  "products": *[_type == "product" && subject._ref == ^._id && visible != false]
    | order(coalesce(sortOrder, 999) asc) {
      _id, title, kind, price, soldOut, subtitle, squareUrl, venmoNote, shippingType
    },
  printEtsyUrl,
  printEtsyPrice,`;

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
  highlightLabel,
  ${PRODUCTS_JOIN}
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
  highlightLabel,
  ${PRODUCTS_JOIN}
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

// Slugs of every artwork, used at build time by getStaticPaths to enumerate the
// static /artwork/<slug> pages to prerender.
export async function getArtworkSlugs(): Promise<string[]> {
  return client.fetch(
    `*[_type == "artwork" && defined(slug.current)].slug.current`
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
