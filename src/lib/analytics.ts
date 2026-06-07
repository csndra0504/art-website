// Thin wrapper around GA4 (gtag.js). Every call safely no-ops when gtag isn't
// available (e.g. ad blockers, local dev, SSR) so callers never need to guard.
//
// Note on this site's funnel: checkout completes off-domain (Square, Venmo,
// Etsy), so GA cannot observe a real `purchase`. We treat the click on a buy
// button as the conversion via `begin_checkout`; true revenue lives in Square.

export interface AnalyticsItem {
  /** Stable id — we use the artwork slug. */
  item_id: string;
  item_name: string;
  /** e.g. "Original", "Print — Etsy". */
  item_variant?: string;
  price?: number;
  quantity?: number;
}

export type PaymentType = "card" | "venmo" | "etsy";

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
}

export function trackBeginCheckout(item: AnalyticsItem, paymentType: PaymentType) {
  send("begin_checkout", {
    currency: "USD",
    value: item.price,
    payment_type: paymentType,
    items: [withDefaults(item)],
  });
}

/** Email signups and commission inquiries. `source` distinguishes them. */
export function trackLead(source: string, params: Record<string, unknown> = {}) {
  send("generate_lead", { source, ...params });
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
}
