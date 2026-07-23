// Builders for schema.org JSON-LD. Kept separate from the <JsonLd> component so
// the shapes are easy to read and reuse. These feed AI crawlers and rich search
// results with a machine-readable description of the artwork, artist, and shows.

import { urlFor } from "./sanity";
import {
  SITE_URL,
  SITE_NAME,
  ARTIST_NAME,
  absoluteUrl,
  INSTAGRAM_URL,
  ETSY_URL,
} from "./seo";
import type { Artwork } from "../types/artwork";
import type { Event } from "../types/event";

const IN_STOCK = "https://schema.org/InStock";
const SOLD_OUT = "https://schema.org/SoldOut";

function shareImage(artwork: Artwork): string | undefined {
  const first = artwork.images?.[0];
  return first ? urlFor(first.asset).width(1200).url() : undefined;
}

// Parse "24 × 36 in" (or "60 x 90 cm") into width/height QuantitativeValues.
// Returns undefined when the string doesn't match, so this stays best-effort.
function parseDimensions(
  dimensions?: string
): { width: object; height: object } | undefined {
  if (!dimensions) return undefined;
  const m = dimensions.match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*([a-z"]+)?/i);
  if (!m) return undefined;
  const unit = (m[3] ?? "in").toLowerCase();
  const unitText = unit.startsWith("cm") ? "cm" : "inch";
  const qv = (v: string) => ({
    "@type": "QuantitativeValue",
    value: Number(v),
    unitText,
  });
  return { width: qv(m[1]), height: qv(m[2]) };
}

function artworkOffers(artwork: Artwork, url: string): object[] {
  const offers: object[] = [];
  const add = (
    name: string,
    price: number | undefined,
    sold: boolean,
    offerUrl?: string
  ) => {
    if (price == null) return;
    offers.push({
      "@type": "Offer",
      name,
      price,
      priceCurrency: "USD",
      availability: sold ? SOLD_OUT : IN_STOCK,
      url: offerUrl ?? url,
      seller: { "@type": "Person", name: ARTIST_NAME },
    });
  };

  add("Original", artwork.originalPrice, !!artwork.originalSold);
  add("Print", artwork.printEtsyPrice, false, artwork.printEtsyUrl);
  add("Print — local pickup", artwork.printLocalPrice, !!artwork.printLocalSold);
  (artwork.customOptions ?? [])
    .filter((o) => o.visible !== false)
    .forEach((o) => add(o.title, o.price, false, o.squareUrl));

  return offers;
}

export function buildArtworkJsonLd(
  artwork: Artwork,
  descriptionExcerpt: string
): object {
  const url = absoluteUrl(`/artwork/${artwork.slug.current}`);
  const image = shareImage(artwork);
  const dims = parseDimensions(artwork.dimensions);

  return {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: artwork.title,
    url,
    ...(image ? { image } : {}),
    ...(descriptionExcerpt ? { description: descriptionExcerpt } : {}),
    creator: { "@type": "Person", name: ARTIST_NAME, url: SITE_URL },
    ...(artwork.medium ? { artMedium: artwork.medium, artform: artwork.medium } : {}),
    ...(artwork.year ? { dateCreated: String(artwork.year) } : {}),
    ...(dims ?? {}),
    ...(artwork.forSale && artworkOffers(artwork, url).length
      ? { offers: artworkOffers(artwork, url) }
      : {}),
  };
}

export function buildEventsJsonLd(events: Event[]): object | null {
  if (!events.length) return null;
  return {
    "@context": "https://schema.org",
    "@graph": events.map((e) => ({
      "@type": "Event",
      name: e.title,
      startDate: e.date,
      ...(e.link ? { url: e.link } : {}),
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@type": "Place",
        name: "Pittsburgh, PA",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Pittsburgh",
          addressRegion: "PA",
          addressCountry: "US",
        },
      },
      performer: { "@type": "Person", name: ARTIST_NAME },
    })),
  };
}

// Commissions are a real revenue line, so describe them as a bookable Service
// with a price range — this is what lets search/AI answer "who does custom
// hand-drawn house portraits in Pittsburgh".
export function buildCommissionsJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Custom Hand-Drawn Art Commissions",
    serviceType: "Custom illustration commission",
    description:
      "One-of-a-kind hand-drawn ink and alcohol-marker illustrations of a place that means something to you — homes, storefronts, bars, and landmarks. Worked from your photos or on-location in Pittsburgh.",
    url: absoluteUrl("/commissions"),
    provider: {
      "@type": "Person",
      name: ARTIST_NAME,
      url: SITE_URL,
      sameAs: [INSTAGRAM_URL, ETSY_URL],
    },
    areaServed: {
      "@type": "City",
      name: "Pittsburgh",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Pittsburgh",
        addressRegion: "PA",
        addressCountry: "US",
      },
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "PriceSpecification",
        minPrice: 100,
        maxPrice: 400,
        priceCurrency: "USD",
      },
      availability: IN_STOCK,
      url: absoluteUrl("/commissions"),
    },
  };
}

// Site identity for the home page: the WebSite plus the artist as a Person,
// with sameAs links so crawlers can tie the site to the Instagram/Etsy presence.
export function buildHomeJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
      },
      {
        "@type": "Person",
        name: ARTIST_NAME,
        url: SITE_URL,
        jobTitle: "Artist",
        description:
          "Pittsburgh-based sketch artist creating hand-drawn originals and prints of the city's landmarks and neighborhoods.",
        sameAs: [INSTAGRAM_URL, ETSY_URL],
      },
    ],
  };
}
