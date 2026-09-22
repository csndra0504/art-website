# PRD — Cart & Square Checkout

**Linear:** [CAS-19](https://linear.app/cassandra-wilcox-art/issue/CAS-19/add-a-cart-and-square-checkout-to-the-website)
· **Project:** Website cart & checkout · **Due:** 2026-11-20 (before the Black Friday send)
· **Status:** Phase 0 decisions closed, pre-implementation

> CAS-19 was retitled and rewritten for Square on 2026-09-05. §5 records why the
> decision changed.

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
| Data model | **A `product` document, referencing an `artwork` subject.** Not purchase options nested in the artwork. | Six subjects already back two products each, and Cathedral of Learning has three originals the current schema can't represent. See [product-model-migration.md](product-model-migration.md). |
| Naming | `_type: "artwork"` in code, **"Subject"** as its Studio title | Renaming a Sanity type means recreating every document; the display title gets the same result for free. |
| Catalog seeding | Idempotent migration script from Sanity | 47 variations, each also needing its Square id written back — 94 manual steps otherwise, with no re-run when a price changes. |
| Order notification | **Square's own merchant emails.** No Brevo. | Square already sends items, buyer and address on a new online order. Zero code, and it still arrives when our webhook handler is the thing that's broken. |
| Returns | "All sales are final", worded as a policy, shown before checkout | Chargeback rights exist regardless of the wording; the policy sets expectations rather than removing rights. |

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

**✅ Resolved by sandbox test, 2026-09-05** (CAS-29 —
[spike-inventory-result.md](spike-inventory-result.md)).

**Stock decrements on payment, not on order completion.** A paid Checkout API
order dropped stock 3 → 2 about six seconds after payment, while the order was
still `state=OPEN` with its fulfillment at `SHIPMENT:PROPOSED`. So the premise
this PRD was written on — "inventory adjusts when an order is completed or
refunded" — is **wrong for the online path**. Nothing has to reach `COMPLETED`
for stock to be correct.

Consequences:

- **Phase 3 gets simpler.** The webhook only mirrors Square's stock into Sanity.
  It does *not* need to complete orders, so a missed webhook leaves the website
  stale rather than leaving Square wrong. No reconciliation path needed.
- **Orders will sit at `OPEN` in the Square dashboard** with an unfulfilled
  shipment until marked fulfilled. That's a fulfillment workflow question, not a
  stock-correctness one — worth knowing before the first real order rather than
  discovering it then.
- **Not tested: refund and cancellation.** Whether stock returns on a refunded or
  cancelled `OPEN` order is still unknown. It doesn't block Phase 2, but don't
  assume it — verify before go-live.
- Tested with one unit on one order in sandbox. Production behaviour is expected
  to match, but the first real order is still worth watching (Phase 4 already
  says to watch the first three).

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

**Rates — Cassandra's estimates, 2026-09-05. Not label-verified.**

| Type | Class | Packaging | Real weight | Charge |
|---|---|---|---|---|
| `magnet` | flat | letter / small mailer | ~1 oz | **$2** |
| `postcard` | flat | rigid mailer | 2–4 oz | **$3** |
| `print` | flat | rigid flat mailer | *no data* | **$5** |
| `original` | flat | rigid flat or tube | 8–12 oz | **$10** |
| `framedSmall` | boxed | boxed, fragile | **≤ 20 oz** | **$10** |
| `framedLarge` | boxed | boxed, insured | **> 20 oz** | **$20** |

**Framed items band by weight, not by what's in the frame.** The old
`framedPrint` / `framedOriginal` split assumed the contents drove the cost; the
data says packed weight does.

**The threshold is 20 oz** (moved from 16 on 2026-09-21). Every package in an
8x10 frame weighs ~16 oz — the one measured is 458 g, 16.16 oz — so a 16 oz line
split identical boxes by rounding. 20 sits in the empty gap between the ~16 oz
8x10 frames and the 40 oz 11x14, so in practice **8x10 frames and smaller ship
small, 11x14 ships large**. A recorded packed weight is treated as "ships
boxed", so framed originals band by weight even though they're titled
"Original".

⚠️ **These are estimates, not measurements**, and they will be charged to real
customers. If they're low, the difference comes out of each sale. `print` is the
weakest of the three — it prices an item type with no recorded shipping data at
all, and prints are what the cart most exists to bundle. Revisit against real
figures after the first orders; tracked as a Phase 4 task rather than remembered.

**Corrected 2026-09-05 against real data.** The Etsy listing drafts in
`artbizhq/projects/etsy/drafts` record actual packed weights and box dimensions
per product. Measured across the 14 framed drafts:

- **Weights: 7, 7, 7, 7, 12, 12, 16, 16, 16, 16, 40 oz.** Nine of eleven are at
  or under 1 lb. The PRD assumed 2–4 lb for framed items; almost nothing is.
- **Boxes: 9×7×1.5, 8×6×3, 12×10×1, 12.6×11.4×1.97, 16×13×2 in.** All well under
  1 cu ft, so dimensional weight doesn't apply on Ground Advantage.
- **A flat $25 on a 7 oz, 9×7×1.5 parcel overcharges by roughly 3×** — and that
  is the most common framed size, not an edge case. Framed items also span
  7 oz → 40 oz, which is too wide for one flat rate in either direction.
- **The 25 print drafts record no shipping data at all.** The `print` rate is
  entirely unverified, and prints are the item the cart is most meant to bundle.

**Consequences for the model:**

- Per-product `shipWeightOz` and dimensions get a home in the new `product`
  document (see [product-model-migration.md](product-model-migration.md) §2), so
  the bands stay auditable and the estimates above can be checked against reality
  without a schema change.
- Rates stay in one config object, as before. The rule at the top of this section
  is unchanged — only the numbers and the banding moved.
- The band threshold is a **property of the rate table, not of the product**. A
  product carries its weight; the table decides where the line falls. Moving the
  threshold later must not mean re-tagging products.

**Verification deferred (2026-09-05 decision).** Real labels were not priced —
the rates above are estimates and knowingly provisional. When the real figures
are wanted, the three parcels worth pricing are the 7 oz framed at 9×7×1.5, the
40 oz framed at 16×13×2, and one weighed print in its rigid flat mailer. Price
each to a near and a far zone: one national flat rate has to cover the worst zone
or absorb the gap. Published USPS Ground Advantage retail starts around $7.90
including $100 insurance and tracking, and Click-N-Ship commercial is cheaper —
but neither figure knows these zones or this discount. Tracked in Phase 4.
- Computed by **our server** as a pure function over cart lines, then attached to
  the Square Order as a shipping charge. The rule lives in our code.
- Two options at checkout: **US shipping** (computed) and **Local pickup —
  Pittsburgh** ($0).
- Item type comes from a `shippingType` field on each purchase option, not
  inferred from the title.

**Site copy must change.** `src/lib/siteContent.ts` promises *"Free shipping
anywhere in the US."* True for Venmo/Square-link orders today, so it must **not**
change until the new checkout is live. Replacement (landed on `cart-phase-1`,
which is held unmerged until checkout works, so it goes live with checkout):

> Shipping is calculated at checkout based on what's in your cart, or arrange free
> local pickup in Pittsburgh.

## 10. UX

Existing design language: square corners (`radius={0}`), `#e8e8e0` hairline
borders, `#fafaf8` fills, dark filled primary buttons. The site design is
unchanged — Square owns only the payment page, which takes your branding.

**Product page (`ArtworkDetail`)**
- Each purchase option row gains **Add to cart** as the primary action.
- ~~Keep **or Venmo** as the secondary link during v1.~~ Removed 2026-09-21: it
  charged the item price with no shipping, so it undercut the cart.
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

**Sanity (`studio/schemaTypes/product.ts`)** — full field list and the migration
plan in [product-model-migration.md](product-model-migration.md).
- A `product` document per sellable thing, with `subject` referencing an
  `artwork`. Replaces the hardcoded `originalPrice` / `printLocal*` /
  `printEtsy*` fields and the `customOptions[]` array.
- `squareVariationId: string` — the catalog link. Required for anything sellable.
- `shippingType: "magnet" | "postcard" | "print" | "original" | "framedSmall" |
  "framedLarge"` — drives §9. Required for anything sellable. Framed items band
  by packed weight (≤20 oz / >20 oz), not by what's in the frame.
- `shipWeightOz` + box dimensions — real packed figures, so §9's bands stay
  auditable.
- `soldOut?: boolean` — mirrored from Square by webhook. Not hand-edited.
- Matching TS types in `src/types/artwork.ts`.

**Cart (client, `localStorage`)**
```ts
type CartLine = {
  productId: string;      // Sanity _id of the product — 1:1 with a Square variation
  qty: number;
  oneOfAKind?: boolean;   // locks qty to 1
  // display-only snapshot; the server never trusts these
  slug: string; title: string; optionTitle: string; price: number; image?: string;
};
```
- One id, not an `artworkId` + `optionKey` composite. The server re-reads price
  and stock from Square by `squareVariationId`, resolved from the product.
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
- Square API down → cart drawer shows an error and offers email.
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

Answered 2026-09-05 unless marked otherwise.

- [ ] **Confirm the §9 rates against three real labels.** Still open, but no
      longer a guess: §9 now names which three to buy, chosen from the real
      weight spread in the Etsy drafts.
- [ ] **Does a paid online order auto-complete, decrementing stock?** (§7) Still
      open — blocked only on sandbox credentials. The test is written and ready
      to run: `scripts/square-inventory-spike.mjs`.
- [x] **Order notification** — Square's own merchant emails. Brevo drops out of
      Phase 3 entirely (§4).
- [x] **"All sales are final"** — keep it, worded as a policy rather than a
      guarantee, shown above the checkout button. Chargeback rights exist
      regardless of the wording, so the policy sets expectations; it doesn't
      remove rights.
- [x] **Catalog seeding** — migration script from Sanity, not by hand (§4).
- [x] **Purchase-option model** — a `product` document referencing an `artwork`
      subject. This one changed the plan rather than confirming it; see
      [product-model-migration.md](product-model-migration.md).
- [x] ~~Does Venmo stay as a secondary option after Phase 4, or get removed?~~
  Removed (2026-09-21), before go-live.
      **Deliberately deferred to CAS-47** — it's a question about how the new
      checkout actually performs, and there's no data to answer it before launch.
- [ ] When does tax get switched on (§6)? **Deferred to CAS-48**, post-launch,
      and filed rather than remembered.
- [ ] What happens to Notion once products move — retired entirely, or kept for
      non-product tracking? **Phase 4.** Note that the `sales`, `subjects` and
      `events` databases are doing work the website never replaces; only
      `inventory` is superseded by Square.
