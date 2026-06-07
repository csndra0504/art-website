// Hardcoded marketing/trust content. Editing any value here changes the live
// site after a rebuild & deploy — no Sanity involved. Kept in one place so the
// shipping promise, testimonials, and welcome offer are easy to find and tweak.

// ---------------------------------------------------------------------------
// Welcome discount
// ---------------------------------------------------------------------------
// IMPORTANT: this code must exist as a real discount in the channels you sell
// through (Square, Etsy) or be honored manually, or buyers will be let down.
// Square: Dashboard → Items & Services → Discounts → create a coupon code.
// Etsy:  Shop Manager → Marketing → Sales & Discounts → new code.
export const WELCOME_DISCOUNT = {
  code: "WELCOME10",
  // Short label used in calls-to-action.
  offer: "10% off your first order",
};

// ---------------------------------------------------------------------------
// Shipping & returns — shown on every product page to de-risk a first purchase.
// ---------------------------------------------------------------------------
// Each string becomes one bullet. Keep them concrete and reassuring; this is
// the single biggest lever on whether a stranger trusts buying an original.
export const SHIPPING_RETURNS: string[] = [
  "Free shipping anywhere in the US — or arrange local pickup in Pittsburgh.",
  "Originals ship within 3–5 business days, packaged flat and rigid to arrive safely.",
  "Arrives damaged? Send a photo within 7 days and I'll replace or refund it — no fuss.",
  "Questions before you buy? Email hello@cassandrawilcoxart.com or DM @casswilcoxart.",
];

// ---------------------------------------------------------------------------
// Testimonials — REAL customer quotes only. The section auto-hides while this
// array is empty, so nothing fabricated ever ships. Paste real reviews here
// (Etsy reviews, emails, DMs — with permission to use a first name).
// ---------------------------------------------------------------------------
export interface Testimonial {
  /** The quote, in the customer's words. */
  quote: string;
  /** Attribution, e.g. "Sarah M." or "Sarah M. · Lawrenceville". */
  attribution: string;
  /** Optional: 1–5 to render stars. Omit to show no rating. */
  rating?: number;
}

export const TESTIMONIALS: Testimonial[] = [
  // Example shape (delete and replace with real ones):
  // {
  //   quote: "It captured our block perfectly — my husband teared up.",
  //   attribution: "Sarah M. · Polish Hill",
  //   rating: 5,
  // },
];

// Optional overall Etsy rating to surface as social proof. Set to null to hide.
export const ETSY_REVIEW_SUMMARY: {
  rating: number;
  count: number;
  url: string;
} | null = null;
