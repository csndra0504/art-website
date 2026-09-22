import type { Request, Response } from "express";
import { checkoutConfig } from "./config.ts";
import { square, SquareError } from "./clients.ts";

// GET /api/order/:orderId — what the success page needs to thank the buyer.
//
// Anyone holding an order id can call this (it arrives in a URL), so it returns
// only what a receipt page would show: items, totals, paid or not, ship or
// pickup. No name, email or address — Square's own receipt email carries those.

const ORDER_ID = /^[A-Za-z0-9]{10,64}$/;

interface SquareOrder {
  id: string;
  location_id: string;
  state: string;
  metadata?: Record<string, string>;
  line_items?: { name?: string; quantity: string; gross_sales_money?: { amount: number } }[];
  total_discount_money?: { amount: number };
  total_tax_money?: { amount: number };
  service_charges?: { name?: string; total_money?: { amount: number } }[];
  tenders?: unknown[];
  total_money?: { amount: number };
}

export async function getOrder(req: Request, res: Response) {
  const cfg = checkoutConfig();
  if ("missing" in cfg) return res.status(503).json({ error: "Unavailable." });

  const orderId = String(req.params.orderId ?? "");
  if (!ORDER_ID.test(orderId)) return res.status(400).json({ error: "Invalid order id." });

  let order: SquareOrder;
  try {
    ({ order } = await square<{ order: SquareOrder }>(cfg, "GET", `/v2/orders/${orderId}`));
  } catch (err) {
    if (err instanceof SquareError && err.status === 404) {
      return res.status(404).json({ error: "Order not found." });
    }
    console.error("Order lookup failed:", err instanceof SquareError ? JSON.stringify(err.errors) : err);
    return res.status(502).json({ error: "Couldn't load the order." });
  }

  // Only orders from this shop's location — the endpoint mustn't become a way
  // to read anything else on the Square account.
  if (order.location_id !== cfg.locationId) {
    return res.status(404).json({ error: "Order not found." });
  }

  // Matched loosely: the fee's name is display copy that has already changed
  // once ("Shipping" → "Flat-rate shipping"), and orders placed under the old
  // name must still show their shipping on this page.
  const shippingCents = (order.service_charges ?? [])
    .filter((c) => (c.name ?? "").toLowerCase().includes("shipping"))
    .reduce((sum, c) => sum + (c.total_money?.amount ?? 0), 0);

  return res.json({
    orderId: order.id,
    // A tender is a payment. An order with none hasn't been paid — the buyer
    // may have landed here without finishing, or Square may not have caught up.
    paid: (order.tenders ?? []).length > 0,
    fulfillment: order.metadata?.fulfillment === "pickup" ? "pickup" : "ship",
    items: (order.line_items ?? []).map((l) => ({
      name: l.name ?? "Item",
      quantity: Number(l.quantity),
      // Before discounts: the receipt shows the 3-for-$25 deal as its own line,
      // rather than spreading it across items as $8.33s.
      totalCents: l.gross_sales_money?.amount ?? 0,
    })),
    discountCents: order.total_discount_money?.amount ?? 0,
    taxCents: order.total_tax_money?.amount ?? 0,
    shippingCents,
    totalCents: order.total_money?.amount ?? 0,
  });
}
