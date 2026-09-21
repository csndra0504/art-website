// Thin wrapper around GA4 (gtag.js). Every call safely no-ops when gtag isn't
// available (e.g. ad blockers, local dev, SSR) so callers never need to guard.
//
// Note on this site's funnel: cart orders return to /checkout/success after
// paying on Square, so they fire a real `purchase` with the order value. Venmo
// and Etsy still complete off-domain with no return trip, so for those the
// click on the buy button (`begin_checkout`) is the conversion we can see.
import posthog from "posthog-js";

export interface AnalyticsItem {
  /** Stable id — we use the artwork slug. */
  item_id: string;
  item_name: string;
  /** e.g. "Original", "Print — Etsy". */
  item_variant?: string;
  price?: number;
  quantity?: number;
}

export type PaymentType = "card" | "venmo" | "etsy" | "square";

function send(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", event, params);
}

function withDefaults(item: AnalyticsItem): AnalyticsItem {
  return { quantity: 1, ...item };
}

export function trackViewItem(item: AnalyticsItem) {
  send("view_item", {
    currency: "USD",
    value: item.price,
    items: [withDefaults(item)],
  });
  posthog.capture("artwork_viewed", {
    item_id: item.item_id,
    item_name: item.item_name,
    price: item.price,
  });
}

export function trackBeginCheckout(item: AnalyticsItem, paymentType: PaymentType) {
  send("begin_checkout", {
    currency: "USD",
    value: item.price,
    payment_type: paymentType,
    items: [withDefaults(item)],
  });
  posthog.capture("checkout_started", {
    item_id: item.item_id,
    item_name: item.item_name,
    item_variant: item.item_variant,
    price: item.price,
    payment_method: paymentType,
  });
}

/** Email signups and commission inquiries. `source` distinguishes them. */
export function trackLead(source: string, params: Record<string, unknown> = {}) {
  send("generate_lead", { source, ...params });
  if (source === "commission_inquiry") {
    posthog.capture("commission_inquiry_started", { ...params });
  } else if (source === "email_signup") {
    posthog.capture("email_signup_submitted", { ...params });
  }
}

// --- Commissions funnel ----------------------------------------------------
// Each step fires to BOTH GA4 (gtag) and PostHog so the funnel reads in either
// tool. `commission_inquiry_started` is the existing event (kept, unchanged),
// fired when the visitor clicks through to the Notion form;
// `commission_inquiry_submitted` marks a completed submission. Note: the form
// itself lives on Notion, so the actual submit happens off-site where we can't
// observe it — the source of truth for completed submissions stays the Notion
// "Commission Intake" database. `trackCommissionSubmitted` is kept for parity
// and any future on-site form.
export function trackCommissionStarted(params: Record<string, unknown> = {}) {
  send("generate_lead", { source: "commission_inquiry", ...params });
  posthog.capture("commission_inquiry_started", { ...params });
}

export function trackCommissionSubmitted(params: Record<string, unknown> = {}) {
  send("generate_lead", { source: "commission_inquiry_submitted", ...params });
  posthog.capture("commission_inquiry_submitted", { ...params });
}

// Fires once when a key page section first scrolls into view, so we can see how
// far down the commissions page visitors actually get (examples, testimonials).
export function trackSectionView(
  section: string,
  params: Record<string, unknown> = {}
) {
  send("view_section", { section, ...params });
  posthog.capture("section_viewed", { section, ...params });
}

/**
 * Demand signal: someone wants a print of a piece that isn't offered as one.
 * item_id/item_name are sent as top-level params (register them as custom
 * dimensions in GA4 to break the report down by artwork).
 */
export function trackRequestPrint(item: AnalyticsItem) {
  send("request_print", {
    item_id: item.item_id,
    item_name: item.item_name,
    items: [withDefaults(item)],
  });
  posthog.capture("print_requested", {
    item_id: item.item_id,
    item_name: item.item_name,
  });
}

/** Checkout started from the cart — the whole cart, not one item. */
export function trackCartCheckout(
  items: AnalyticsItem[],
  value: number,
  fulfillment: "ship" | "pickup"
) {
  send("begin_checkout", {
    currency: "USD",
    value,
    payment_type: "square",
    items: items.map(withDefaults),
  });
  posthog.capture("checkout_started", {
    value,
    payment_method: "square",
    fulfillment,
    item_count: items.reduce((n, i) => n + (i.quantity ?? 1), 0),
  });
}

/**
 * A paid cart order. The caller guarantees this fires once per order: the
 * success page can be refreshed or revisited, and each visit must not count
 * the revenue again.
 */
export function trackPurchase(order: {
  transactionId: string;
  value: number;
  shipping: number;
  fulfillment: "ship" | "pickup";
  items: AnalyticsItem[];
}) {
  send("purchase", {
    transaction_id: order.transactionId,
    currency: "USD",
    value: order.value,
    shipping: order.shipping,
    items: order.items.map(withDefaults),
  });
  posthog.capture("order_completed", {
    order_id: order.transactionId,
    value: order.value,
    shipping: order.shipping,
    fulfillment: order.fulfillment,
    item_count: order.items.reduce((n, i) => n + (i.quantity ?? 1), 0),
  });
}
