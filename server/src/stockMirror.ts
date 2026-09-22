import { checkoutConfig, sandboxProductIdFor, SQUARE_ENV, type CheckoutConfig } from "./config.ts";
import { square } from "./clients.ts";
import type { SquareEvent } from "./webhook.ts";

// Square stock → Sanity `soldOut`, so the static site follows sales made
// anywhere — a market stall included — without asking Square on every page view.
//
// In the sandbox this only logs. There is one Sanity dataset and it's the live
// one, so a test sale writing soldOut would mark the real piece sold on the
// real site. Production writes.

interface InventoryCount {
  catalog_object_id: string;
  catalog_object_type?: string;
  state: string;
  location_id: string;
  quantity: string;
}

interface ProductState {
  _id: string;
  title: string;
  subject?: string | null;
  soldOut?: boolean | null;
  hasDraft: boolean;
}

export async function mirrorInventory(event: SquareEvent) {
  const cfg = checkoutConfig();
  // Throwing makes the webhook answer 500, so Square retries once it's fixed.
  if ("missing" in cfg) throw new Error(`Not configured: ${cfg.missing.join(", ")}`);

  const obj = event.data?.object as { inventory_counts?: InventoryCount[] } | undefined;
  const variationIds = [
    ...new Set(
      (obj?.inventory_counts ?? [])
        .filter((c) => c.location_id === cfg.locationId)
        .map((c) => c.catalog_object_id)
    ),
  ];
  if (variationIds.length === 0) return;

  // Re-read the counts rather than trusting the event's. Deliveries can arrive
  // late or out of order; the current count is right however many times, and in
  // whatever order, this runs.
  const { counts = [] } = await square<{ counts?: InventoryCount[] }>(
    cfg,
    "POST",
    "/v2/inventory/counts/batch-retrieve",
    { catalog_object_ids: variationIds, location_ids: [cfg.locationId] }
  );

  for (const variationId of variationIds) {
    const inStock = counts.find(
      (c) => c.catalog_object_id === variationId && c.state === "IN_STOCK"
    );
    // Same reading as checkout: no IN_STOCK record means none left.
    const soldOut = !inStock || Number(inStock.quantity) <= 0;

    const product = await findProduct(cfg, variationId);
    if (!product) {
      // Something in Square the website doesn't sell (a market-only item).
      console.log(`Stock mirror: ${variationId} isn't a website product; skipped`);
      continue;
    }
    const name = `${product.subject ?? "?"} — ${product.title} (${product._id})`;
    if (Boolean(product.soldOut) === soldOut) {
      console.log(`Stock mirror: ${name} already ${soldOut ? "sold out" : "available"}`);
      continue;
    }

    if (SQUARE_ENV === "sandbox") {
      console.log(
        `Stock mirror [sandbox, not written]: would mark ${name} ${soldOut ? "SOLD OUT" : "available again"}`
      );
      continue;
    }

    await setSoldOut(cfg, product, soldOut);
    console.log(`Stock mirror: marked ${name} ${soldOut ? "SOLD OUT" : "available again"}`);
  }
}

async function findProduct(cfg: CheckoutConfig, variationId: string): Promise<ProductState | null> {
  const sandboxId = SQUARE_ENV === "sandbox" ? sandboxProductIdFor(variationId) : undefined;
  if (SQUARE_ENV === "sandbox" && !sandboxId) return null;

  const url = new URL(
    `https://${cfg.sanityProjectId}.api.sanity.io/v2024-01-01/data/query/${cfg.sanityDataset}`
  );
  url.searchParams.set(
    "query",
    `*[_type == "product" && !(_id in path("drafts.**")) && (_id == $id || squareVariationId == $variationId)][0]{
      _id, title, soldOut, "subject": subject->title,
      "hasDraft": defined(*[_id == "drafts." + ^._id][0]._id)
    }`
  );
  url.searchParams.set("$id", JSON.stringify(sandboxId ?? ""));
  url.searchParams.set("$variationId", JSON.stringify(sandboxId ? "" : variationId));
  // Drafts are only visible with a token; without one hasDraft reads false,
  // which is fine in the sandbox where nothing is written.
  const token = process.env.SANITY_WRITE_TOKEN;
  const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
  if (!res.ok) throw new Error(`Sanity query → ${res.status}`);
  const { result } = (await res.json()) as { result: ProductState | null };
  return result;
}

async function setSoldOut(cfg: CheckoutConfig, product: ProductState, soldOut: boolean) {
  const token = process.env.SANITY_WRITE_TOKEN;
  if (!token) throw new Error("SANITY_WRITE_TOKEN missing; can't mirror stock");

  // An open draft gets the same value. Otherwise publishing it later would
  // quietly put back the old soldOut and un-sell a piece that's gone.
  const ids = product.hasDraft ? [product._id, `drafts.${product._id}`] : [product._id];
  const res = await fetch(
    `https://${cfg.sanityProjectId}.api.sanity.io/v2024-01-01/data/mutate/${cfg.sanityDataset}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ mutations: ids.map((id) => ({ patch: { id, set: { soldOut } } })) }),
    }
  );
  if (!res.ok) throw new Error(`Sanity mutate → ${res.status}: ${await res.text()}`);
}
