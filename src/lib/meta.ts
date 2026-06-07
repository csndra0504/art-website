// Imperative per-page <meta> management for this client-rendered SPA.
//
// Scope: this fixes search engines that execute JS (Google) and gives each
// route correct description/OG/Twitter tags + canonical URL. It does NOT fix
// social scrapers (Facebook, iMessage, X) that read the initial HTML without
// running JS — that needs build-time prerendering, planned as a follow-up.
//
// setPageMeta() updates tags in place (creating any that are missing) and
// returns a cleanup that restores the previous values, so navigating away in
// the SPA doesn't leave one piece's preview stuck on the next page.

const SITE_URL = "https://cassandrawilcoxart.com";

export interface PageMeta {
  /** Share/SEO title (og:title, twitter:title). Separate from document.title. */
  title?: string;
  description?: string;
  /** Absolute or root-relative URL of the share image. */
  image?: string;
  /** Path (e.g. "/artwork/foo") or full URL; resolved against the site origin. */
  url?: string;
  /** og:type — "website" (default) or "article". */
  type?: string;
}

type Restore = () => void;

function absolute(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// Find or create a <meta>/<link> by an attribute selector, returning the
// element plus a function that restores its prior attribute value on cleanup.
function setTag(
  tag: "meta" | "link",
  attr: "name" | "property" | "rel",
  key: string,
  valueAttr: "content" | "href",
  value: string,
): Restore {
  const selector = `${tag}[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLElement>(selector);
  const created = !el;
  const prev = el?.getAttribute(valueAttr) ?? null;

  if (!el) {
    el = document.createElement(tag);
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute(valueAttr, value);

  return () => {
    if (!el) return;
    if (created) {
      el.remove();
    } else if (prev !== null) {
      el.setAttribute(valueAttr, prev);
    }
  };
}

export function setPageMeta(meta: PageMeta): Restore {
  const restores: Restore[] = [];

  if (meta.title) {
    restores.push(setTag("meta", "property", "og:title", "content", meta.title));
    restores.push(setTag("meta", "name", "twitter:title", "content", meta.title));
  }
  if (meta.description) {
    restores.push(setTag("meta", "name", "description", "content", meta.description));
    restores.push(setTag("meta", "property", "og:description", "content", meta.description));
    restores.push(setTag("meta", "name", "twitter:description", "content", meta.description));
  }
  if (meta.image) {
    const img = absolute(meta.image);
    restores.push(setTag("meta", "property", "og:image", "content", img));
    restores.push(setTag("meta", "name", "twitter:image", "content", img));
  }
  if (meta.url) {
    const url = absolute(meta.url);
    restores.push(setTag("meta", "property", "og:url", "content", url));
    restores.push(setTag("link", "rel", "canonical", "href", url));
  }
  if (meta.type) {
    restores.push(setTag("meta", "property", "og:type", "content", meta.type));
  }

  return () => restores.forEach((r) => r());
}
