import { SQUARE_BASE, SQUARE_VERSION, type CheckoutConfig } from "./config.ts";

// Thin fetch wrappers — no SDKs, matching the scripts, so the API has one
// dependency (Express) to keep up to date.

export class SquareError extends Error {
  readonly status: number;
  readonly errors: unknown;
  constructor(message: string, status: number, errors: unknown) {
    super(message);
    this.name = "SquareError";
    this.status = status;
    this.errors = errors;
  }
}

export async function square<T>(
  cfg: CheckoutConfig,
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${SQUARE_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new SquareError(`Square ${method} ${path} → ${res.status}`, res.status, json.errors);
  }
  return json as T;
}

export interface ProductRecord {
  _id: string;
  title: string;
  kind: string;
  price: number;
  soldOut?: boolean | null;
  visible?: boolean | null;
  shippingType?: string | null;
  squareVariationId?: string | null;
  subject?: string | null;
}

// Published content only, through the uncached API rather than the CDN: this
// decides what a buyer is charged, so it must see a price change or a sale the
// moment it's published.
export async function fetchProducts(
  cfg: CheckoutConfig,
  ids: string[]
): Promise<ProductRecord[]> {
  const url = new URL(
    `https://${cfg.sanityProjectId}.api.sanity.io/v2024-01-01/data/query/${cfg.sanityDataset}`
  );
  url.searchParams.set(
    "query",
    `*[_type == "product" && _id in $ids]{
      _id, title, kind, price, soldOut, visible, shippingType, squareVariationId,
      "subject": subject->title
    }`
  );
  url.searchParams.set("$ids", JSON.stringify(ids));
  url.searchParams.set("perspective", "published");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity query → ${res.status}`);
  const json = (await res.json()) as { result: ProductRecord[] };
  return json.result;
}
