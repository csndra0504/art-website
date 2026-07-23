import { Head } from "vite-react-ssg";
import { absoluteUrl, DEFAULT_SHARE_IMAGE } from "../lib/seo";

export interface SeoHeadProps {
  /** Full document + share title. */
  title: string;
  description?: string;
  /** Path or absolute URL of the share image. Falls back to the site default. */
  image?: string;
  /** Path (e.g. "/artwork/foo") used for canonical + og:url. */
  path?: string;
  /** og:type — "website" (default) or "article". */
  type?: "website" | "article";
  /** Optional alt text for the share image. */
  imageAlt?: string;
}

// Single source of truth for per-page <title>, description, canonical, and
// Open Graph / Twitter tags. Rendered on every route so the static build bakes
// correct tags into each page's HTML (the reason index.html no longer carries
// page-level meta). Wraps vite-react-ssg's <Head> (react-helmet-async).
export function SeoHead({
  title,
  description,
  image,
  path,
  type = "website",
  imageAlt,
}: SeoHeadProps) {
  const url = path ? absoluteUrl(path) : undefined;
  const img = absoluteUrl(image ?? DEFAULT_SHARE_IMAGE);

  return (
    <Head>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      {url && <meta property="og:url" content={url} />}
      <meta property="og:image" content={img} />
      {imageAlt && <meta property="og:image:alt" content={imageAlt} />}

      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={img} />

      {url && <link rel="canonical" href={url} />}
    </Head>
  );
}
