#!/usr/bin/env node
/**
 * Phase 0 spike (CAS-29) — does a paid online Square order auto-complete and
 * decrement stock, or does it sit at OPEN waiting on fulfillment?
 *
 * This is the question that blocks the Phase 2 design (PRD §7). If stock drops
 * on its own, the webhook handler only has to mirror the result into Sanity. If
 * it doesn't, the handler also has to complete the order — which is a different
 * failure mode to reason about, because a missed webhook then means stock stays
 * wrong rather than merely stale.
 *
 * Sandbox only, by construction: the base URL is hardcoded and there is no
 * override. Do not add one — the script sets inventory counts and creates
 * catalog objects, neither of which should ever touch live data.
 *
 * Usage:
 *   node scripts/square-inventory-spike.mjs            # run the spike
 *   node scripts/square-inventory-spike.mjs --cleanup  # also delete the test item
 *
 * Requires in .env:
 *   SQUARE_SANDBOX_ACCESS_TOKEN=EAAA...
 *   SQUARE_SANDBOX_LOCATION_ID=...   (optional — resolved from the API if absent)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Hardcoded. See the header comment — this must never point at production.
const BASE = "https://connect.squareupsandbox.com";
const SQUARE_VERSION = process.env.SQUARE_VERSION ?? "2025-01-23";

const CLEANUP = process.argv.includes("--cleanup");
const OPENING_STOCK = 3;
const RESULT_FILE = join(ROOT, "docs/cart-checkout/spike-inventory-result.md");

// How long to wait for someone to pay the checkout link, and how long to watch
// for stock to move afterwards. The settle window matters: Square may complete
// the order asynchronously, so a single reading right after payment can lie.
const PAYMENT_TIMEOUT_MS = 15 * 60 * 1000;
const SETTLE_WINDOW_MS = 90 * 1000;
const POLL_MS = 5000;

// ---------------------------------------------------------------- env + http

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
  console.error(
    "Missing SQUARE_SANDBOX_ACCESS_TOKEN in .env.\n" +
      "Get it from developer.squareup.com → your app → Sandbox → Credentials.\n" +
      "Scopes needed: ITEMS_READ/WRITE, INVENTORY_READ/WRITE, ORDERS_READ/WRITE, PAYMENTS_WRITE."
  );
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
    const err = new Error(`${method} ${path} → ${res.status} ${detail || text}`);
    err.errors = json.errors;
    err.status = res.status;
    throw err;
  }
  return json;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = () => randomUUID();

// ------------------------------------------------------------------- helpers

async function resolveLocation() {
  if (process.env.SQUARE_SANDBOX_LOCATION_ID) {
    return process.env.SQUARE_SANDBOX_LOCATION_ID;
  }
  const { locations = [] } = await square("GET", "/v2/locations");
  const active = locations.find((l) => l.status === "ACTIVE") ?? locations[0];
  if (!active) throw new Error("No sandbox locations on this account.");
  console.log(`  (resolved location ${active.id} — ${active.name})`);
  return active.id;
}

async function stockCount(variationId, locationId) {
  const { counts = [] } = await square(
    "POST",
    "/v2/inventory/counts/batch-retrieve",
    { catalog_object_ids: [variationId], location_ids: [locationId] }
  );
  const inStock = counts.find((c) => c.state === "IN_STOCK");
  return inStock ? Number(inStock.quantity) : 0;
}

function fulfillmentSummary(order) {
  const f = order.fulfillments ?? [];
  if (f.length === 0) return "none";
  return f.map((x) => `${x.type ?? "?"}:${x.state ?? "?"}`).join(", ");
}

// ---------------------------------------------------------------------- spike

const stamp = Date.now();
const SKU = `SPIKE-${stamp}`;
const samples = [];
let itemId;

console.log("Square inventory spike — sandbox\n");

const locationId = await resolveLocation();

// 1. A catalog item with inventory tracking on. Tracking is the whole point:
//    without track_inventory Square will not decrement anything, so if this
//    were missed the spike would "prove" the wrong answer.
console.log("\n1. Creating tracked catalog item…");
const created = await square("POST", "/v2/catalog/object", {
  idempotency_key: key(),
  object: {
    type: "ITEM",
    id: "#spike-item",
    item_data: {
      name: `SPIKE inventory test ${stamp}`,
      description: "Phase 0 spike. Safe to delete.",
      variations: [
        {
          type: "ITEM_VARIATION",
          id: "#spike-var",
          item_variation_data: {
            item_id: "#spike-item",
            name: "Regular",
            sku: SKU,
            pricing_type: "FIXED_PRICING",
            price_money: { amount: 100, currency: "USD" },
            track_inventory: true,
            location_overrides: [
              { location_id: locationId, track_inventory: true },
            ],
          },
        },
      ],
    },
  },
});

const mappings = created.id_mappings ?? [];
itemId = mappings.find((m) => m.client_object_id === "#spike-item")?.object_id;
const variationId = mappings.find(
  (m) => m.client_object_id === "#spike-var"
)?.object_id;
if (!variationId) throw new Error("No variation id came back from Square.");
console.log(`  item ${itemId}`);
console.log(`  variation ${variationId} (SKU ${SKU})`);

// 2. Opening stock.
console.log(`\n2. Setting stock to ${OPENING_STOCK}…`);
await square("POST", "/v2/inventory/changes/batch-create", {
  idempotency_key: key(),
  changes: [
    {
      type: "PHYSICAL_COUNT",
      physical_count: {
        catalog_object_id: variationId,
        state: "IN_STOCK",
        location_id: locationId,
        quantity: String(OPENING_STOCK),
        occurred_at: new Date().toISOString(),
      },
    },
  ],
});
const before = await stockCount(variationId, locationId);
console.log(`  confirmed: ${before} in stock`);
if (before !== OPENING_STOCK) {
  console.warn(`  ⚠ expected ${OPENING_STOCK}, got ${before}`);
}

// 3. A hosted checkout for one unit, referencing the catalog object. Ad-hoc
//    line items never decrement stock (PRD §7), so this must be catalog-linked
//    or the spike measures nothing.
console.log("\n3. Creating a hosted checkout link…");
const { payment_link: link } = await square(
  "POST",
  "/v2/online-checkout/payment-links",
  {
    idempotency_key: key(),
    order: {
      location_id: locationId,
      line_items: [{ catalog_object_id: variationId, quantity: "1" }],
    },
    checkout_options: { ask_for_shipping_address: true },
  }
);
const orderId = link.order_id;

console.log(`\n  ${"─".repeat(66)}`);
console.log(`  PAY THIS LINK:\n\n  ${link.url}\n`);
console.log("  Sandbox test card: 4111 1111 1111 1111");
console.log("  Any future expiry · CVV 111 · postal code 94103");
console.log(`  ${"─".repeat(66)}\n`);
console.log(`  order ${orderId}`);
console.log("\n4. Waiting for payment…");

// 4. Wait for a tender to appear.
const deadline = Date.now() + PAYMENT_TIMEOUT_MS;
let order;
let paid = false;
while (Date.now() < deadline) {
  ({ order } = await square("GET", `/v2/orders/${orderId}`));
  if ((order.tenders ?? []).length > 0) {
    paid = true;
    break;
  }
  await sleep(POLL_MS);
}

if (!paid) {
  console.error("\n  Timed out waiting for payment. Nothing proven — rerun.");
  process.exit(1);
}
console.log(`  paid. order state=${order.state}`);

// 5. Watch for the settle window. A single reading immediately after payment
//    can't distinguish "never decrements" from "decrements a few seconds later".
console.log(`\n5. Watching stock and order state for ${SETTLE_WINDOW_MS / 1000}s…\n`);
const watchUntil = Date.now() + SETTLE_WINDOW_MS;
let decrementedAt = null;
while (Date.now() < watchUntil) {
  ({ order } = await square("GET", `/v2/orders/${orderId}`));
  const qty = await stockCount(variationId, locationId);
  const t = Math.round((Date.now() - (watchUntil - SETTLE_WINDOW_MS)) / 1000);
  const row = {
    t,
    state: order.state,
    fulfillments: fulfillmentSummary(order),
    stock: qty,
  };
  samples.push(row);
  console.log(
    `  +${String(t).padStart(3)}s  state=${row.state.padEnd(9)} ` +
      `stock=${row.stock}  fulfillments=${row.fulfillments}`
  );
  if (qty < before && decrementedAt === null) {
    decrementedAt = t;
    break;
  }
  await sleep(POLL_MS);
}

// 6. If it never moved, find out what it takes. This is the actionable half:
//    knowing we must complete the order ourselves changes the webhook design.
let manualResult = null;
if (decrementedAt === null) {
  console.log("\n6. Stock did not move. Trying to complete the order manually…");
  const { order: current } = await square("GET", `/v2/orders/${orderId}`);

  try {
    await square("PUT", `/v2/orders/${orderId}`, {
      idempotency_key: key(),
      order: { version: current.version, state: "COMPLETED" },
    });
    const after = await stockCount(variationId, locationId);
    manualResult = {
      how: "set order state to COMPLETED directly",
      ok: true,
      stock: after,
    };
    console.log(`  completed the order. stock now ${after}`);
  } catch (err) {
    console.log(`  direct completion rejected — ${err.message}`);
    // Most likely the fulfillment has to be completed first; try that path.
    const fulfillments = current.fulfillments ?? [];
    if (fulfillments.length === 0) {
      manualResult = { how: "direct COMPLETED", ok: false, error: err.message };
    } else {
      try {
        const { order: updated } = await square("PUT", `/v2/orders/${orderId}`, {
          idempotency_key: key(),
          order: {
            version: current.version,
            fulfillments: fulfillments.map((f) => ({
              uid: f.uid,
              state: "COMPLETED",
            })),
          },
        });
        await sleep(POLL_MS);
        const after = await stockCount(variationId, locationId);
        manualResult = {
          how: "complete the fulfillment(s), which completes the order",
          ok: true,
          stock: after,
          orderState: updated.state,
        };
        console.log(
          `  completed fulfillments. order state=${updated.state}, stock now ${after}`
        );
      } catch (err2) {
        manualResult = {
          how: "complete fulfillments",
          ok: false,
          error: err2.message,
        };
        console.log(`  fulfillment completion rejected — ${err2.message}`);
      }
    }
  }
}

// ------------------------------------------------------------------- verdict

const finalStock = await stockCount(variationId, locationId);
const autoDecremented = decrementedAt !== null;

console.log(`\n${"═".repeat(70)}`);
console.log("VERDICT");
console.log("═".repeat(70));
if (autoDecremented) {
  console.log(
    `A paid online order DOES auto-decrement stock (after ~${decrementedAt}s).\n` +
      "Phase 2/3: the webhook only has to mirror the result into Sanity."
  );
} else {
  console.log(
    "A paid online order does NOT auto-decrement stock on its own.\n" +
      `Order sat at state=${order.state} for the whole ${SETTLE_WINDOW_MS / 1000}s window.`
  );
  if (manualResult?.ok) {
    console.log(
      `Completing it manually works: ${manualResult.how}.\n` +
        "Phase 2/3: our webhook handler must complete the order, THEN mirror\n" +
        "to Sanity. A missed webhook leaves Square stock wrong, not just stale —\n" +
        "which needs a reconciliation path the PRD does not currently describe."
    );
  } else {
    console.log(
      `Manual completion also failed (${manualResult?.error ?? "not attempted"}).\n` +
        "Needs a closer look before Phase 2 is designed."
    );
  }
}
console.log(`\nstock: ${before} → ${finalStock}`);
console.log("═".repeat(70));

// Durable record — TASKS.md Notes is the loop's memory, and a spike nobody
// wrote down is a spike that gets run twice.
const md = `# Spike result — online order → inventory (CAS-29)

Run ${new Date().toISOString()} · Square-Version ${SQUARE_VERSION} · sandbox
Variation \`${variationId}\` (SKU \`${SKU}\`) · order \`${orderId}\`

**Verdict:** ${
  autoDecremented
    ? `paid online orders DO auto-decrement (~${decrementedAt}s after payment).`
    : "paid online orders do NOT auto-decrement."
}
${
  autoDecremented
    ? "The webhook only mirrors the result into Sanity."
    : manualResult?.ok
      ? `Manual completion works: ${manualResult.how}. The webhook handler must complete the order, then mirror.`
      : `Manual completion failed: ${manualResult?.error ?? "not attempted"}.`
}

Stock ${before} → ${finalStock}.

| t | order state | stock | fulfillments |
|---|---|---|---|
${samples.map((s) => `| +${s.t}s | ${s.state} | ${s.stock} | ${s.fulfillments} |`).join("\n")}
`;
writeFileSync(RESULT_FILE, md);
console.log(`\nWritten to ${RESULT_FILE}`);

if (CLEANUP && itemId) {
  await square("DELETE", `/v2/catalog/object/${itemId}`);
  console.log(`Cleaned up catalog item ${itemId}.`);
} else if (itemId) {
  console.log(`\nTest item left in the sandbox catalog: ${itemId}`);
  console.log("Rerun with --cleanup to delete it.");
}
