import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { checkoutConfig, variationIdFor } from "./config.ts";
import { fetchProducts, square, SquareError, type ProductRecord } from "./clients.ts";
import {
  MissingShippingTypeError,
  shippingCents,
  type FulfillmentMethod,
} from "../../src/lib/shipping.ts";
import type { ShippingType } from "../../src/types/artwork.ts";

// POST /api/checkout — turn a cart into a Square hosted checkout.
//
// The browser sends only product ids, quantities and ship-or-pickup. Everything
// that decides money is re-read here: prices come from the Square catalog item
// each line references, availability from Sanity and live Square stock,
// shipping from the shared rules. Nothing the browser says about price counts.

const MAX_LINES = 50;
const MAX_QTY = 20;
// Sanity ids: migrated products are "product-…", Studio-created ones are UUIDs.
const ID_PATTERN = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,127}$/;

interface Line {
  productId: string;
  qty: number;
}
interface Rejection {
  productId: string;
  reason: string;
}

function parseBody(
  body: unknown
): { items: Line[]; fulfillment: FulfillmentMethod } | string {
  if (!body || typeof body !== "object") return "Expected a JSON body.";
  const { items, fulfillment } = body as Record<string, unknown>;
  if (fulfillment !== "ship" && fulfillment !== "pickup") {
    return "fulfillment must be 'ship' or 'pickup'.";
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
    return "items must be a non-empty list.";
  }
  // Duplicate ids are merged, so a cart can't dodge the one-of-a-kind check by
  // listing the same original twice.
  const merged = new Map<string, number>();
  for (const item of items) {
    const { productId, qty } = (item ?? {}) as Record<string, unknown>;
    if (typeof productId !== "string" || !ID_PATTERN.test(productId) || productId.startsWith("drafts.")) {
      return "Invalid productId.";
    }
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return `qty must be a whole number from 1 to ${MAX_QTY}.`;
    }
    merged.set(productId, (merged.get(productId) ?? 0) + qty);
  }
  return {
    items: [...merged].map(([productId, qty]) => ({ productId, qty })),
    fulfillment,
  };
}

export async function createCheckout(req: Request, res: Response) {
  const cfg = checkoutConfig();
  if ("missing" in cfg) {
    console.error("Checkout not configured; missing:", cfg.missing.join(", "));
    return res.status(503).json({ error: "Checkout isn't available right now." });
  }

  const parsed = parseBody(req.body);
  if (typeof parsed === "string") return res.status(400).json({ error: parsed });
  const { items, fulfillment } = parsed;

  let products: ProductRecord[];
  try {
    products = await fetchProducts(cfg, items.map((i) => i.productId));
  } catch (err) {
    console.error("Product lookup failed:", err);
    return res.status(502).json({ error: "Couldn't check availability. Please try again." });
  }
  const byId = new Map(products.map((p) => [p._id, p]));

  // Every problem is collected and returned together, one reason per line, so
  // the cart can say exactly what's wrong instead of failing opaquely.
  const rejections: Rejection[] = [];
  const lines: (Line & { product: ProductRecord; variationId: string })[] = [];
  for (const item of items) {
    const product = byId.get(item.productId);
    const reject = (reason: string) => rejections.push({ productId: item.productId, reason });
    if (!product || product.visible === false) { reject("no longer available"); continue; }
    if (product.soldOut) { reject("sold out"); continue; }
    if (product.kind === "original" && item.qty > 1) { reject("one of a kind — only one available"); continue; }
    const variationId = variationIdFor(product);
    if (!variationId) { reject("can't be bought online yet"); continue; }
    lines.push({ ...item, product, variationId });
  }

  // Live stock, from Square. Sanity's soldOut flag is a mirror and can lag; this
  // is what catches an original sold at a market while it sat in someone's cart.
  if (lines.length) {
    try {
      const { counts = [] } = await square<{
        counts?: { catalog_object_id: string; state: string; quantity: string }[];
      }>(cfg, "POST", "/v2/inventory/counts/batch-retrieve", {
        catalog_object_ids: lines.map((l) => l.variationId),
        location_ids: [cfg.locationId],
      });
      for (const l of lines) {
        const inStock = counts.find(
          (c) => c.catalog_object_id === l.variationId && c.state === "IN_STOCK"
        );
        const available = inStock ? Number(inStock.quantity) : 0;
        if (available < l.qty) {
          rejections.push({
            productId: l.productId,
            reason: available === 0 ? "sold out" : `only ${available} left`,
          });
        }
      }
    } catch (err) {
      console.error("Stock check failed:", err instanceof SquareError ? JSON.stringify(err.errors) : err);
      return res.status(502).json({ error: "Couldn't check stock. Please try again." });
    }
  }

  if (rejections.length) {
    return res.status(409).json({ error: "Some items can't be bought right now.", lines: rejections });
  }

  let shipping: number;
  try {
    shipping = shippingCents(
      lines.map((l) => ({
        shippingType: l.product.shippingType as ShippingType | null,
        qty: l.qty,
        title: `${l.product.subject} — ${l.product.title}`,
      })),
      fulfillment
    );
  } catch (err) {
    // A product with no shipping band is our data problem, not the buyer's —
    // but it must never ship free. Offer pickup instead.
    if (err instanceof MissingShippingTypeError) {
      console.error("No shipping type for:", err.titles.join(", "));
      return res.status(409).json({
        error: "We can't work out shipping for some items yet. Choose local pickup, or email hello@cassandrawilcoxart.com.",
        lines: lines
          .filter((l) => !l.product.shippingType)
          .map((l) => ({ productId: l.productId, reason: "can't be shipped yet — pickup only" })),
      });
    }
    throw err;
  }

  // Shared by create and update, so the update can't drop an option.
  const checkoutOptions = (redirectUrl: string) => ({
    redirect_url: redirectUrl,
    ask_for_shipping_address: fulfillment === "ship",
  });

  try {
    const { payment_link } = await square<{
      payment_link: { id: string; version: number; url: string; order_id: string };
    }>(cfg, "POST", "/v2/online-checkout/payment-links", {
      idempotency_key: randomUUID(),
      order: {
        location_id: cfg.locationId,
        // Catalog-referenced lines: Square charges its catalog price, and only
        // catalog lines decrement stock when paid (the Phase 0 spike).
        line_items: lines.map((l) => ({
          catalog_object_id: l.variationId,
          quantity: String(l.qty),
        })),
        // Shipping is an order charge, not checkout_options.shipping_fee: Square
        // adds the shipping_fee to the order again on every link update, even
        // one that leaves it out, so the redirect update below would charge it
        // twice (confirmed in the sandbox: $10 print → $16).
        ...(fulfillment === "ship" && shipping > 0
          ? {
              service_charges: [
                {
                  name: "Shipping",
                  amount_money: { amount: shipping, currency: "USD" },
                  calculation_phase: "SUBTOTAL_PHASE",
                  taxable: false,
                },
              ],
            }
          : {}),
        // Read back by the success page to word its next steps.
        metadata: { fulfillment },
      },
      checkout_options: checkoutOptions(`${cfg.siteUrl}/checkout/success`),
      // Shows on the payment in the Square dashboard, so a pickup order isn't
      // mistaken for one that needs posting.
      ...(fulfillment === "pickup"
        ? { payment_note: "LOCAL PICKUP (Pittsburgh) — arrange with the buyer" }
        : {}),
    });

    // Square returns the buyer to redirect_url exactly as given — it appends
    // nothing (confirmed in the sandbox) — and the order id only exists once
    // the link does. So point the link back at a URL naming its own order. If
    // this fails the checkout still works: the success page falls back to the
    // id the browser saved before leaving.
    try {
      await square(cfg, "PUT", `/v2/online-checkout/payment-links/${payment_link.id}`, {
        payment_link: {
          version: payment_link.version,
          checkout_options: checkoutOptions(
            `${cfg.siteUrl}/checkout/success?orderId=${encodeURIComponent(payment_link.order_id)}`
          ),
        },
      });
    } catch (err) {
      console.error("Couldn't set order-specific redirect:", err instanceof SquareError ? JSON.stringify(err.errors) : err);
    }

    return res.json({ url: payment_link.url, orderId: payment_link.order_id });
  } catch (err) {
    console.error("Payment link failed:", err instanceof SquareError ? JSON.stringify(err.errors) : err);
    return res.status(502).json({ error: "Checkout is unavailable right now. Please try again." });
  }
}
