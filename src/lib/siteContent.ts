// Hardcoded marketing/trust content. Editing any value here changes the live
// site after a rebuild & deploy — no Sanity involved. Kept in one place so the
// shipping promise and testimonials are easy to find and tweak.

// ---------------------------------------------------------------------------
// Shipping & returns — shown on every product page to de-risk a first purchase.
// ---------------------------------------------------------------------------
// Each string becomes one bullet. Keep them concrete and reassuring; this is
// the single biggest lever on whether a stranger trusts buying an original.
export const SHIPPING_RETURNS: string[] = [
  "Shipping is calculated at checkout based on what's in your cart, or arrange free local pickup in Pittsburgh.",
  "Originals ship within 3–5 business days, packaged flat and rigid to arrive safely.",
  "All sales are final. No refunds on direct purchases. If you'd like refund protection, order through Etsy instead.",
  "Questions before you buy? Email hello@cassandrawilcoxart.com or DM @casswilcoxart.",
];

// ---------------------------------------------------------------------------
// Holiday shipping — one place to change the dates. Everything is "YYYY-MM-DD"
// and compared against the visitor's local date. Cutoffs assume ~3 business days
// of processing plus USPS ground transit, with a buffer, so a package ordered on
// the cutoff still lands by Dec 24 (see lib/holiday.ts). Check the carrier's own
// published last-ship dates before changing these.
// ---------------------------------------------------------------------------
export const HOLIDAY = {
  /** First day the messaging shows. */
  startDate: "2026-11-15",
  /** Last day it shows (Christmas Eve). Nothing renders after this. */
  endDate: "2026-12-24",
  /** Last day to order a flat item (print, magnet, unframed original) and have it arrive by the 24th. */
  cutoff: "2026-12-10",
  /** Framed pieces ship in their own boxes and are heavier, so they close earlier. */
  framedCutoff: "2026-12-08",
  /**
   * Markets where an order can be picked up in person. Mirrors the Events page
   * by hand — update both if a market is added or dropped.
   */
  pickupDates: ["2026-12-04", "2026-12-11", "2026-12-12", "2026-12-16", "2026-12-19"],
} as const;

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
