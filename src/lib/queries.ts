import { client } from "./sanity";
import type {
  Artwork,
  ArtworkImage,
  ArtworkSummary,
  ProductKind,
  ShippingType,
} from "../types/artwork";
import type { Event } from "../types/event";


// What's for sale comes from the subject's product documents, not from fields on
// the artwork. The Etsy link stays on the subject: it isn't a product, just the
// fallback shown when nothing local is for sale (see lib/offers.ts).
const PRODUCTS_JOIN = `
  "products": *[_type == "product" && subject._ref == ^._id && visible != false]
    | order(coalesce(sortOrder, 999) asc) {
      _id, title, kind, price, soldOut, subtitle, shippingType
    },
  printEtsyUrl,
  printEtsyPrice,`;

const ARTWORK_SUMMARY_PROJECTION = `{
  _id,
  _createdAt,
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

/** A small flat item (magnet, sticker) offered as an add-on in the cart. */
export interface AddOnProduct {
  _id: string;
  title: string;
  kind: ProductKind;
  price: number;
  shippingType: ShippingType;
  subject: {
    title: string;
    slug: string;
    image?: ArtworkImage;
  };
}

// Only what checkout can actually sell: linked to Square, with a shipping band
// (checkout refuses a product without one), in stock, and on a subject that is
// itself for sale. Newest first, so fresh merch leads.
export async function getAddOns(): Promise<AddOnProduct[]> {
  return client.fetch(
    `*[_type == "product"
        && kind in ["magnet", "sticker"]
        && visible != false
        && soldOut != true
        && channel != "etsy"
        && defined(squareVariationId)
        && defined(shippingType)
        && subject->forSale == true
        && defined(subject->slug.current)
      ] | order(_createdAt desc) {
      _id, title, kind, price, shippingType,
      "subject": subject->{ title, "slug": slug.current, "image": images[0] }
    }`
  );
}

export interface CartProductState {
  _id: string;
  title: string;
  price: number;
  soldOut?: boolean | null;
  visible?: boolean | null;
  shippingType?: ShippingType | null;
  /** Null when the subject is unpublished — the piece's page is gone. */
  subjectTitle: string | null;
}

// The products in a visitor's saved cart, as they are now. Published only;
// a product missing from the result has been deleted.
export async function getCartProducts(ids: string[]): Promise<CartProductState[]> {
  return client.fetch(
    `*[_type == "product" && _id in $ids]{
      _id, title, price, soldOut, visible, shippingType,
      "subjectTitle": subject->title
    }`,
    { ids },
    { perspective: "published" }
  );
}
