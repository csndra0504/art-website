import { existsSync, readFileSync } from "node:fs";

// Configuration, read once. Missing config doesn't stop the process: the health
// route must keep answering (nginx and the deploy rely on it), so routes that
// need something check `checkoutConfig()` and answer 503 instead.

// Sandbox unless production is asked for by name. The expensive mistake is
// real charges during development, never the other way round.
export const SQUARE_ENV: "sandbox" | "production" =
  process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";

export const SQUARE_BASE =
  SQUARE_ENV === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

export const SQUARE_VERSION = process.env.SQUARE_VERSION ?? "2025-01-23";

// In the sandbox, product → variation ids come from a map written by
// scripts/seed-sandbox-catalog.mjs, never from Sanity (there is one dataset and
// it's live). In production they come from each product's squareVariationId.
interface SandboxCatalog {
  locationId: string;
  variations: Record<string, string>;
}
const SANDBOX_MAP_URL = new URL("../sandbox-catalog.json", import.meta.url);
const sandboxCatalog: SandboxCatalog | null =
  SQUARE_ENV === "sandbox" && existsSync(SANDBOX_MAP_URL)
    ? (JSON.parse(readFileSync(SANDBOX_MAP_URL, "utf8")) as SandboxCatalog)
    : null;

export function variationIdFor(product: {
  _id: string;
  squareVariationId?: string | null;
}): string | undefined {
  return SQUARE_ENV === "sandbox"
    ? sandboxCatalog?.variations[product._id]
    : product.squareVariationId ?? undefined;
}

// The reverse, for webhooks: which sandbox product a variation belongs to.
// Production looks this up in Sanity instead (by squareVariationId).
export function sandboxProductIdFor(variationId: string): string | undefined {
  const entry = Object.entries(sandboxCatalog?.variations ?? {}).find(
    ([, v]) => v === variationId
  );
  return entry?.[0];
}

export interface CheckoutConfig {
  token: string;
  locationId: string;
  sanityProjectId: string;
  sanityDataset: string;
  siteUrl: string;
}

export function checkoutConfig(): CheckoutConfig | { missing: string[] } {
  const token =
    process.env.SQUARE_ACCESS_TOKEN ??
    (SQUARE_ENV === "sandbox" ? process.env.SQUARE_SANDBOX_ACCESS_TOKEN : undefined);
  const locationId =
    process.env.SQUARE_LOCATION_ID ?? sandboxCatalog?.locationId ?? undefined;
  const sanityProjectId =
    process.env.SANITY_PROJECT_ID ?? process.env.VITE_SANITY_PROJECT_ID;
  const sanityDataset =
    process.env.SANITY_DATASET ?? process.env.VITE_SANITY_DATASET ?? "production";
  // Where Square sends the buyer after paying. Defaults to the dev server only
  // in the sandbox; production must say where the real site is.
  const siteUrl =
    process.env.SITE_URL ?? (SQUARE_ENV === "sandbox" ? "http://localhost:5173" : undefined);

  const missing = Object.entries({
    "SQUARE_ACCESS_TOKEN": token,
    "SQUARE_LOCATION_ID": locationId,
    "SANITY_PROJECT_ID": sanityProjectId,
    "SITE_URL": siteUrl,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) return { missing };
  return {
    token: token!,
    locationId: locationId!,
    sanityProjectId: sanityProjectId!,
    sanityDataset,
    siteUrl: siteUrl!.replace(/\/$/, ""),
  };
}
