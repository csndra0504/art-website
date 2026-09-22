#!/usr/bin/env node
/**
 * Mirror the website's products into the Square SANDBOX catalog, with stock,
 * so checkout (CAS-41) can be built and tested end to end against realistic
 * data before any production credentials are involved.
 *
 * Writes server/sandbox-catalog.json — { [sanityProductId]: sandboxVariationId }
 * — which the checkout API reads when running against the sandbox. Sandbox ids
 * deliberately never go into Sanity: there is only one dataset, the live one,
 * and test ids in live content are one bad merge away from sending real
 * customers to a sandbox checkout. (In production the API reads each product's
 * real squareVariationId instead — that link is CAS-37, done at go-live.)
 *
 * Sandbox only, by construction: the base URL is hardcoded with no override.
 * Do not add one — this creates catalog items and sets stock counts.
 *
 * Idempotent: the SKU is the Sanity product id, so a re-run updates existing
 * sandbox items rather than duplicating them. Stock is reset each run.
 *
 * Usage:
 *   node scripts/seed-sandbox-catalog.mjs            # dry run
 *   node scripts/seed-sandbox-catalog.mjs --apply
 *
 * Requires in .env: SQUARE_SANDBOX_ACCESS_TOKEN, VITE_SANITY_PROJECT_ID
 * Optional:         SQUARE_SANDBOX_LOCATION_ID (resolved from the API if absent)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@sanity/client";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = join(ROOT, "server/sandbox-catalog.json");

// Hardcoded. See the header comment — this must never point at production.
const BASE = "https://connect.squareupsandbox.com";
const SQUARE_VERSION = process.env.SQUARE_VERSION ?? "2025-01-23";

const APPLY = process.argv.includes("--apply");
const STOCK_ORIGINAL = 1;
const STOCK_OTHER = 10;

function loadEnv() {
  let raw;
  try {
    raw = readFileSync(join(ROOT, ".env"), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}
loadEnv();

const TOKEN = process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
if (!TOKEN) {
  console.error("Missing SQUARE_SANDBOX_ACCESS_TOKEN in .env.");
  process.exit(1);
}

async function square(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail = (json.errors ?? [])
      .map((e) => `${e.category}/${e.code}: ${e.detail ?? ""}`)
      .join("; ");
    throw new Error(`${method} ${path} → ${res.status} ${detail || text}`);
  }
  return json;
}

async function resolveLocation() {
  if (process.env.SQUARE_SANDBOX_LOCATION_ID) return process.env.SQUARE_SANDBOX_LOCATION_ID;
  const { locations = [] } = await square("GET", "/v2/locations");
  const active = locations.find((l) => l.status === "ACTIVE") ?? locations[0];
  if (!active) throw new Error("No sandbox locations on this account.");
  return active.id;
}

// Read-only, published content only — no token needed.
const sanity = createClient({
  projectId: process.env.VITE_SANITY_PROJECT_ID,
  dataset: process.env.VITE_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
});

const products = await sanity.fetch(`*[_type == "product" && visible != false]{
  _id, title, kind, price, soldOut, "subject": subject->title
} | order(subject asc, title asc)`);

// Every existing sandbox variation, indexed by SKU. Listing once is simpler and
// more robust at this size than relying on search semantics.
const bySku = new Map();
let cursor;
do {
  const qs = new URLSearchParams({ types: "ITEM" });
  if (cursor) qs.set("cursor", cursor);
  const page = await square("GET", `/v2/catalog/list?${qs}`);
  for (const item of page.objects ?? []) {
    for (const v of item.item_data?.variations ?? []) {
      const sku = v.item_variation_data?.sku;
      if (sku) bySku.set(sku, { item, variation: v });
    }
  }
  cursor = page.cursor;
} while (cursor);

const stockFor = (p) => (p.soldOut ? 0 : p.kind === "original" ? STOCK_ORIGINAL : STOCK_OTHER);
const existing = products.filter((p) => bySku.has(p._id));
const toCreate = products.filter((p) => !bySku.has(p._id));

console.log(`\nSquare SANDBOX catalog seed`);
console.log(`Products on the site:     ${products.length}`);
console.log(`Already in sandbox (SKU): ${existing.length}`);
console.log(`To create:                ${toCreate.length}`);
console.log(`Stock: originals ${STOCK_ORIGINAL}, others ${STOCK_OTHER}, sold items 0\n`);

if (!APPLY) {
  for (const p of toCreate.slice(0, 12)) {
    console.log(`  + ${p.subject} — ${p.title}  $${p.price}  stock ${stockFor(p)}`);
  }
  if (toCreate.length > 12) console.log(`  … and ${toCreate.length - 12} more`);
  console.log("\nDry run — nothing written. Re-run with --apply.\n");
  process.exit(0);
}

const locationId = await resolveLocation();

// Create what's missing, in one batch. Names are composed "Subject — Product"
// because product titles are format-only; 28 items called "Original" would be
// unusable in a Square dashboard.
if (toCreate.length) {
  const objects = toCreate.map((p, i) => ({
    type: "ITEM",
    id: `#item-${i}`,
    present_at_all_locations: true,
    item_data: {
      name: `${p.subject} — ${p.title}`,
      variations: [
        {
          type: "ITEM_VARIATION",
          id: `#var-${i}`,
          present_at_all_locations: true,
          item_variation_data: {
            item_id: `#item-${i}`,
            name: p.title,
            sku: p._id,
            pricing_type: "FIXED_PRICING",
            price_money: { amount: Math.round(p.price * 100), currency: "USD" },
            // Without tracking, Square never decrements stock — the point of all this.
            track_inventory: true,
          },
        },
      ],
    },
  }));
  const res = await square("POST", "/v2/catalog/batch-upsert", {
    idempotency_key: randomUUID(),
    batches: [{ objects }],
  });
  const ids = new Map((res.id_mappings ?? []).map((m) => [m.client_object_id, m.object_id]));
  toCreate.forEach((p, i) => {
    const variationId = ids.get(`#var-${i}`);
    if (variationId) bySku.set(p._id, { variation: { id: variationId } });
  });
  console.log(`✓ Created ${toCreate.length} sandbox items.`);
}

// Reset stock for everything, so each run leaves a known starting state.
const changes = products
  .filter((p) => bySku.has(p._id))
  .map((p) => ({
    type: "PHYSICAL_COUNT",
    physical_count: {
      catalog_object_id: bySku.get(p._id).variation.id,
      state: "IN_STOCK",
      location_id: locationId,
      quantity: String(stockFor(p)),
      occurred_at: new Date().toISOString(),
    },
  }));
// The inventory API takes at most 100 changes per call.
for (let i = 0; i < changes.length; i += 100) {
  await square("POST", "/v2/inventory/changes/batch-create", {
    idempotency_key: randomUUID(),
    changes: changes.slice(i, i + 100),
  });
}
console.log(`✓ Stock set for ${changes.length} items at location ${locationId}.`);

const map = Object.fromEntries(
  products.filter((p) => bySku.has(p._id)).map((p) => [p._id, bySku.get(p._id).variation.id])
);
writeFileSync(
  OUT_FILE,
  JSON.stringify({ locationId, generatedAt: new Date().toISOString(), variations: map }, null, 2) + "\n"
);
console.log(`✓ Wrote ${Object.keys(map).length} mappings to server/sandbox-catalog.json\n`);
