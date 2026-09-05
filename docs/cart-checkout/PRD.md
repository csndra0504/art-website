# PRD — Cart & Square Checkout

**Linear:** [CAS-19](https://linear.app/cassandra-wilcox-art/issue/CAS-19/add-a-cart-and-stripe-checkout-to-the-website)
· **Project:** Website cart & checkout · **Due:** 2026-11-20 (before the Black Friday send)
· **Status:** draft, pre-implementation

> ⚠️ **CAS-19 says Stripe. This PRD says Square.** The issue title and body need
> updating — see §5 for why the decision changed.

---

## 1. Problem

- Every purchase is a **hand-off to someone else's checkout**: Square payment
  links, Venmo deep links, Etsy listings.
- **In-person markets are the larger sales channel**, and they run on Square POS.
  The website knows nothing about them.
- Consequences:
  - **An original sold at a Saturday market stays "available" on the website.**
    This is the real double-sale risk — not two web buyers racing, but two
    *channels* with no shared truth.
  - **No multi-item orders.** The 3-for-$25 postcard bundle can't be bought as
    priced. Three postcards = three payments, or a lost sale.
  - **No purchase event.** Checkout completes off-domain, so PostHog loses the
    buyer at `begin_checkout` and can't attribute revenue.
  - **Inventory lives in Notion**, maintained by hand, reconciled against nothing.
  - **No order record.** Fulfillment details arrive by DM.

## 2. Goal

- One cart, one checkout, and **one system of record shared with in-person sales**,
  so stock is true across both channels and a market sale updates the website
  without anyone remembering to do it.

## 3. Non-goals (v1)

- Accounts, login, saved carts across devices.
- Discount codes / gift cards. *(WELCOME10 is a known follow-up — separate issue.)*
- Replacing Etsy. Etsy listings stay exactly as they are.
- An admin order dashboard — the Square dashboard is the order dashboard.
- Sales tax — deferred, see §6.
- Migrating historical Notion inventory data. Start clean with current stock.

## 4. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Platform | **Square**, hosted Checkout API | Unifies with in-person POS. See §5. |
| Backend | Small Node service in the existing `docker-compose`, nginx-proxied at `/api` | Square access token can't ship to a static site. Reuses the droplet + deploy pipeline; no new vendor. |
| Catalog | **Square holds sellable items + stock.** Sanity holds artwork content and a `squareVariationId` link. | Square only auto-adjusts inventory for line items referencing catalog objects (§7). |
| Inventory | Square is system of record. **Notion retired for products.** | One system, both channels. |
| Sold status on site | Square webhook mirrors a `sold` bit into Sanity | Preserves the existing static-site data flow (§8). |
| Scope | Originals + local prints + custom options. Etsy links untouched. | Etsy has its own fulfillment and refund policy. |
| Shipping | Boxed items per unit; flat items collapse to the highest rate, waived when boxed present | See §9. |
| Tax | None in v1 | See §6. |

## 5. Why Square, not Stripe

The decision changed mid-planning. Recording the reasoning so it isn't relitigated.

**Cost is a wash.** Modeled on ten $10 8×10 prints:

| | 10 separate orders | One order of 10 |
|---|---|---|
| Stripe (2.9% + 30¢) | $5.90 | $3.07 |
| Square Free (3.3% + 30¢) | $6.30 | $3.50 |

A 40¢ difference on $100. Meanwhile **bundling those ten prints into one order
saves ~$4.27** — ten times the platform gap. The cart is the cost win; the
processor is noise. *(Square Plus matches Stripe's online rate but needs
~$7,250/mo online volume to break even on its subscription. Don't buy it.)*

**In-person decides it.**
- Markets are the bigger channel and already run on Square POS.
- Square in-person is **2.6% + 15¢** — better than either platform's online rate.
- Stripe *does* have Terminal and Tap to Pay, but no turnkey POS app for a market
  stall; you'd build or buy one. Not worth it.
- Two payment systems means two inventories, two payout accounts, two tax
  pictures, and a website that can't see the larger channel.

**What Square costs us:** 0.4% more per online sale, and a catalog that must live
in Square rather than inline at checkout time (§7). Both acceptable.

## 6. Tax — deferred, deliberately

- CAS-19 originally called for tax at PA 7% (6% state + 1% Allegheny).
  **Decision: not in v1.** Revisit after the first orders land.
- Consequence, stated plainly: PA in-state sales are under-collected until it's on.
- Square Orders support tax natively, so switching on is configuration rather than
  rework — but it assumes registration with the PA Department of Revenue.
- **File as a follow-up issue at launch**, not left to memory.

## 7. Catalog & inventory

**Square is the system of record. Notion is retired for products.**

**The constraint that shapes everything:** Square auto-adjusts inventory only when
an order's line items **reference catalog objects** (`CatalogItemVariation`).
Ad-hoc line items don't decrement stock. So sellable things must exist in the
Square catalog — we can't price inline at checkout the way a Stripe build would.

**Division of labour:**

| | Square | Sanity |
|---|---|---|
| Price | ✅ source of truth | mirrored for display |
| Stock count | ✅ source of truth | mirrored as a `sold` bit |
| Title, images, description, tags | — | ✅ source of truth |
| SEO, story, layout | — | ✅ source of truth |

- Each purchase option in Sanity gains `squareVariationId`. An option without one
  can't be added to the cart — fail loudly in the Studio, not at checkout.
- **Originals:** stock 1. Selling at a market decrements it; the website follows.
- **Prints & postcards:** real counts now that they're free to track.

**⚠️ Open risk:** inventory adjusts when an order is *completed or refunded*. When
a paid online order transitions to `COMPLETED` isn't documented clearly — it may
wait on fulfillment. POS sales complete at the point of sale, so the
**market → website** direction (the one that matters) works. The **web → stock**
direction needs a sandbox test before Phase 2 is designed. Tracked as a spike.

## 8. Architecture

Keeping the existing static-site data flow intact is deliberate: pages already
seed from build-time loader data and refetch Sanity on the client. Rather than
teach the site to query Square live on every page view, a webhook **mirrors**
stock status into Sanity, and the site keeps reading Sanity exactly as it does now.

```
Market sale (Square POS) ──▶ Square inventory ──▶ webhook ──▶ Sanity sold=true ──▶ website
                                     ▲
Browser (static, nginx)              │            Node service (same droplet)
─────────────────────                │            ──────────────────────────
Cart state in localStorage           │
  │ POST /api/checkout               │                │
  │   { items: [{ artworkId, optionKey, qty }] }      │
  │──────────────────────────────────────────────────▶│
  │              re-read price + stock from Square catalog
  │              reject sold-out / unknown items
  │              compute shipping from cart (§9)
  │                                  │                │ create Order + Checkout ──▶ Square
  │◀───────────── { url } ───────────────────────────│
  │ redirect ─────────────────────────────────────────────────────────────────▶ Square hosted
  │                                  │                │◀── webhook: payment / order updated
  │                          mirror stock to Sanity, email order
  │◀── redirect to /checkout/success?orderId=… ────────────────────────────────
```

- **Node service:** TypeScript, Hono or Express, Square SDK + `@sanity/client`.
  Lives in `server/`, own Dockerfile, added to `docker-compose.yml`.
- **nginx:** new `location /api/ { proxy_pass ... }`. Webhook routes need the
  **raw body** for signature verification — no JSON parser in front.
- **Secrets:** `SQUARE_ACCESS_TOKEN`, `SQUARE_WEBHOOK_SIGNATURE_KEY`,
  `SQUARE_LOCATION_ID`, `SANITY_WRITE_TOKEN`, `BREVO_API_KEY` → GitHub Actions
  secrets → droplet `.env`. Never in the bundle.
- **Sandbox first.** Square sandbox credentials through Phase 3.

## 9. Shipping

Customers have asked to be charged actual shipping, so v1 charges — simply.

Item types split by how they physically ship. Flat things nest in one mailer;
framed things each need their own box.

```
shipping = sum(boxed items, per unit)
         + (any boxed item present ? 0 : highest flat rate present)
```

- **Boxed** — framed print, framed original. Charged **per unit**: two framed
  originals are two boxes.
- **Flat** — magnet, postcard, unframed print, unframed original. The **highest**
  flat rate present is charged **once**: a magnet and a print share one mailer
  sized for the print, so $6, not $8.
- **Flat is waived entirely when anything boxed is in the cart** — small flat
  items ride along in the box. Accurate, and generous at the moment someone is
  spending the most.

*(An earlier draft charged once per type across the board. That predates framed
items being in scope and would have eaten the second framed original's shipping.)*

| Cart | Charge |
|---|---|
| 3 postcards | postcard rate |
| 1 magnet + 1 print | print rate only (highest flat) |
| 2 framed prints | 2 × framed print rate |
| 1 framed original + 3 magnets | framed original rate only |
| anything, local pickup | $0 |

**Rates — recommended, pending verification against real labels:**

| Type | Packaging | Est. real cost | Charge |
|---|---|---|---|
| `magnet` | letter / small mailer, ~1 oz | $1–2 | **$2** |
| `postcard` | rigid mailer | $2–4 | **$3** |
| `print` | rigid flat mailer, 6–8 oz | $5–7 | **$6** |
| `original` | rigid flat or tube | $8–12 | **$10** |
| `framedPrint` | boxed, 2–4 lb, fragile | $12–18 | **$15** |
| `framedOriginal` | boxed, insured | $20–30 | **$25** |

- Derived from published USPS Ground Advantage retail rates (from **$7.90**, $100
  insurance + tracking included); Click-N-Ship commercial is cheaper. **Check
  against three real labels before go-live** — these don't know your zones, box
  sizes, or commercial discount. Framed originals matter most: most expensive to
  get wrong, and most likely to need insurance above the included $100.
- Computed by **our server** as a pure function over cart lines, then attached to
  the Square Order as a shipping charge. The rule lives in our code.
- Two options at checkout: **US shipping** (computed) and **Local pickup —
  Pittsburgh** ($0).
- Item type comes from a `shippingType` field on each purchase option, not
  inferred from the title.

**Site copy must change.** `src/lib/siteContent.ts` promises *"Free shipping
anywhere in the US."* True for Venmo/Square-link orders today, so it must **not**
change until the new checkout is live. Drafted replacement, to land in Phase 4:

> Shipping is calculated at checkout based on what's in your cart, or arrange free
> local pickup in Pittsburgh.

## 10. UX

Existing design language: square corners (`radius={0}`), `#e8e8e0` hairline
borders, `#fafaf8` fills, dark filled primary buttons. The site design is
unchanged — Square owns only the payment page, which takes your branding.

**Product page (`ArtworkDetail`)**
- Each purchase option row gains **Add to cart** as the primary action.
- Keep **or Venmo** as the secondary link during v1 — a proven path.
- Etsy options keep **Order Print** → Etsy, unchanged.
- Sold-out items show the existing Sold badge, no cart button.
- After adding: brief inline confirmation, cart badge increments. **No modal.**

**Cart**
- **Drawer**, not a page. Opens from the header icon; `/cart` as a full-page fallback.
- Per line: thumbnail, title, option name, unit price, qty stepper, remove.
- Footer: subtotal, "Shipping calculated at checkout", **Checkout** button.
- Empty state: one line of copy + link to the gallery.

**Checkout**
- Redirect to Square-hosted checkout. Email + shipping address collected there.
- `cancel_url` → `/cart` with the cart **intact**.

**Post-purchase**
- `/checkout/success?orderId=…` — thank-you, order summary, fulfillment timeline,
  contact email. **Clears the cart.**
- Offer the email signup here — a buyer is the warmest possible subscriber.

**Trust**
- `ShippingReturns` on the product page and in the cart drawer.
- All-sales-final policy shown **before** the checkout button.

## 11. Data model

**Sanity (`studio/schemaTypes/artwork.ts`)**
- `squareVariationId: string` on each purchase option — the catalog link. Required
  for anything sellable.
- `shippingType: "magnet" | "postcard" | "print" | "original" | "framedPrint" |
  "framedOriginal"` — drives §9. Required for anything sellable.
- `soldOut?: boolean` — mirrored from Square by webhook. Not hand-edited.
- Matching TS types in `src/types/artwork.ts`.

**Cart (client, `localStorage`)**
```ts
type CartLine = {
  artworkId: string;      // Sanity _id
  optionKey: string;      // custom option _key
  squareVariationId: string;
  qty: number;
  // display-only snapshot; the server never trusts these
  title: string; optionTitle: string; price: number; image?: string;
};
```
- Version the stored payload (`{ v: 1, lines: [] }`) so a schema change discards
  stale carts instead of crashing.
- Reconcile on load: drop lines that are gone or sold out, tell the user what went.

## 12. API

| Route | Purpose | Notes |
|---|---|---|
| `POST /api/checkout` | Build a Square Order, return a hosted checkout `url` | Price + stock re-read from Square. Shipping computed. Per-line rejection reasons. |
| `POST /api/square/webhook` | Payment / order / inventory events | Raw body + signature verify. **Idempotent** — retries happen. |
| `GET /api/health` | Deploy check | |
| `GET /api/order/:orderId` | Success-page summary | Non-sensitive fields only. |

**Security boundary:** the browser sends only `{ artworkId, optionKey, qty }`. The
server re-reads price and stock from Square. Client prices are display-only.

## 13. Analytics

- Extend `PaymentType` in `src/lib/analytics.ts` with `"square"`.
- New events: `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`,
  and **`purchase` on the return URL with order value** (required by CAS-19).
- Fire `purchase` **once** per order id — guard against refresh double-counting.

## 14. Edge cases

- Item sells out between add-to-cart and checkout → block with a message naming
  the item, keep the rest of the cart.
- **An original sells at a market while it's in someone's web cart** → caught at
  checkout by the stock re-read. The whole point of the design.
- Duplicate one-of-a-kind in cart → qty locked to 1.
- Webhook arrives before the user returns → success page must work from the order
  alone, not client state.
- Webhook never arrives / Sanity mirror fails → **payment already succeeded.** Log
  loudly and email regardless; never fail silently. Square stays correct even when
  the mirror lags.
- Square API down → cart drawer shows an error, Venmo stays reachable.
- Option missing `squareVariationId` → not sellable; surface in the Studio.

## 15. Acceptance criteria

- [ ] Add two different items to the cart, checkout in sandbox, land on the success
      page with a correct summary, cart empty.
- [ ] Three postcards check out as one order at the bundle price with one postcard
      shipping charge.
- [ ] Checkout collects a full shipping address.
- [ ] A sold-out item cannot be added to the cart or checked out.
- [ ] **Selling an original on Square POS marks it sold on the website** with no
      manual step. The headline criterion.
- [ ] Cassandra receives an order email with items, buyer email, shipping address.
- [ ] PostHog records `purchase` with order value, once per order.
- [ ] Cancelling returns to `/cart` with the cart intact.
- [ ] Cart survives a reload and a browser restart.
- [ ] Drawer usable at 375px wide.
- [ ] `npm run build` passes; artwork pages still prerender.
- [ ] No access token reachable from the browser bundle.
- [ ] One real order reconciled end to end against Square.

## 16. Phasing

- **Phase 0 — Spikes & decisions.** Sandbox test of the inventory-on-completion
  question (§7). Shipping rates. Catalog seeding approach.
- **Phase 1 — Cart, no payments.** Cart state, drawer, header badge, add-to-cart.
  Harmless to ship; nothing charges.
- **Phase 2 — Catalog + checkout.** Square catalog seeded, `squareVariationId`
  wired, `server/`, `/api/checkout`, shipping calc, success/cancel pages, sandbox.
- **Phase 3 — Webhooks & fulfillment.** Signature verify, stock mirror into Sanity,
  order email. **Verify the market → website path.**
- **Phase 4 — Go live.** Production credentials, real rates, shipping copy update,
  decide Venmo's fate, one real order, watch the first three.

Task-level breakdown in [TASKS.md](TASKS.md) and in Linear under CAS-19.

## 17. Open questions

- [ ] **Confirm the §9 rates against three real labels.** They're derived from
      published USPS retail pricing, not your zones or commercial discount.
- [ ] **Does a paid online order auto-complete, decrementing stock?** (§7) Blocks
      Phase 2 design. Sandbox test.
- [ ] Does Venmo stay as a secondary option after Phase 4, or get removed?
- [ ] Order notification via Brevo (already integrated) or Square's own emails?
- [ ] Does "all sales are final" survive, given card chargeback rights?
- [ ] When does tax get switched on (§6)?
- [ ] What happens to Notion once products move — retired entirely, or kept for
      non-product tracking?
