// Site-wide SEO constants and helpers shared by <SeoHead> and the JSON-LD
// builders. Since checkout and social live off-domain, the canonical origin is
// hard-coded here (not derived from window) so it's correct during the static
// build too.

export const SITE_URL = "https://cassandrawilcoxart.com";
export const SITE_NAME = "Cassandra Wilcox Art";
export const ARTIST_NAME = "Cassandra Wilcox";

// Default share/preview image for pages without their own (home, events, etc.).
export const DEFAULT_SHARE_IMAGE = "/images/bryant_house_8x10.jpg";

export const INSTAGRAM_URL = "https://instagram.com/casswilcoxart";
export const ETSY_URL = "https://www.etsy.com/shop/CassWilcoxArt";

// Resolve a path or already-absolute URL against the site origin.
export function absoluteUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}
