# Cart & Checkout — task spine

State file for the agent loop. **Read this first, work the top unchecked task,
run `/verify`, tick it, append anything surprising to Notes.** One task ≈ one commit.

Spec: [PRD.md](PRD.md) · Linear: [CAS-19](https://linear.app/cassandra-wilcox-art/issue/CAS-19/add-a-cart-and-stripe-checkout-to-the-website)
· Due 2026-11-20

**Status:** not started · **Last touched:** 2026-09-05
**Platform: Square** (changed from Stripe — see PRD §5)

> Linear is the source of truth for status. This file is the loop's working
> memory — keep both ticked.

**Linear issues** (all sub-issues of CAS-19, project *Website cart & checkout*):

| | Issue |
|---|---|
| Phase 0 | CAS-29 inventory spike · CAS-30 shipping rates · CAS-31 credentials |
| Phase 1 | CAS-32 cart state · CAS-33 drawer + badge · CAS-34 add to cart · CAS-35 /cart + analytics |
| Phase 2 | CAS-36 schema · CAS-37 seed script · CAS-38 stock counts · CAS-39 server scaffold · CAS-40 shipping calc · CAS-41 /api/checkout · CAS-42 success page |
| Phase 3 | CAS-43 webhook verify · CAS-44 stock mirror + order email |
| Phase 4 | CAS-45 shipping copy · CAS-46 go live · CAS-47 Venmo decision |
| Post-launch | CAS-48 turn on PA sales tax |

PRD document: <https://linear.app/cassandra-wilcox-art/document/prd-cart-and-square-checkout-2a83e6d0a599>

---

## Phase 0 — Spikes & decisions (human-ish, blocks Phase 2)

- [ ] **Spike: does a paid online Square order auto-complete and decrement stock?**
      Square adjusts inventory on order *completion*, and it's undocumented whether
      a paid Checkout API order completes automatically or waits on fulfillment.
      Test in the Square sandbox. Blocks the Phase 2 design. (PRD §7)
- [ ] **Confirm shipping rates against three real labels.** Recommended rates are
      in PRD §9 (magnet $2 / postcard $3 / print $6 / original $10 / framed print
      $15 / framed original $25), derived from published USPS retail rates — not
      from your actual zones, box sizes, or commercial discount. Check the framed
      original hardest.
- [ ] Update CAS-19 in Linear: title and body still say Stripe.
- [ ] Decide how the Square catalog gets seeded — migration script from Sanity, or
      by hand in the Square dashboard.
- [ ] Square sandbox credentials + location ID in hand.
- [ ] Sanity token with write access, for the stock mirror.
- [ ] Answer the rest of PRD §17.

## Phase 1 — Cart, no payments

*(Independent of the platform decision — safe to start now.)*

- [ ] `src/lib/cart.ts` — versioned localStorage cart: add / remove / setQty /
      clear / subtotal. Pure functions, no React.
- [ ] `src/lib/cartContext.tsx` — provider + `useCart()`, mounted in `RootLayout`.
      Must be SSG-safe: no `localStorage` during prerender.
- [ ] Cart reconciliation on load — drop lines that are gone or sold out, surface
      what was removed.
- [ ] `src/components/CartDrawer.tsx` — Mantine Drawer in the site's square /
      hairline style. Line items, qty steppers, subtotal, empty state.
- [ ] Header cart icon + count badge. Hidden at zero.
- [ ] `Add to cart` on `ArtworkDetail` options. Venmo stays secondary, Etsy options
      untouched, suppressed on sold-out items.
- [ ] One-of-a-kind items lock to qty 1.
- [ ] `/cart` route as a full-page fallback (`src/App.tsx`).
- [ ] Analytics: `add_to_cart`, `remove_from_cart`, `view_cart`.
- [ ] **Verify:** `/verify` clean, drawer usable at 375px, cart survives reload.

## Phase 2 — Catalog & checkout

- [ ] Sanity schema: `squareVariationId`, `shippingType`, `soldOut` on purchase
      options; matching TS types. Studio warns on a sellable option with no
      variation id. `shippingType` is a required enum for anything sellable:
      `magnet` | `postcard` | `print` | `original` | `framedPrint` |
      `framedOriginal` (PRD §9).
- [ ] **`studio/scripts/seed-square-catalog.mjs`** — seed the Square catalog from
      Sanity and link the two. Blocked on the schema task above and the Phase 0
      spike. Design already worked out, don't re-derive:
      - **Idempotent, matched by SKU.** Some items are already in Square. Stable
        SKU scheme: `CW-{slug}-{option-title}`, slugified, uppercased, capped at
        60 chars. Re-running must never duplicate.
      - **Dry-run by default**, `--apply` to write, `--update-prices` to push
        Sanity prices to Square. It writes to live production data — the default
        must be safe.
      - **List the whole catalog once** (`GET /v2/catalog/list?types=ITEM`, follow
        `cursor`) and index variations by SKU locally, rather than relying on
        search-endpoint semantics. Robust at this catalog size, and one pass
        reports on everything, not just what we thought to ask about.
      - Create via `POST /v2/catalog/batch-upsert` with `#temp` ids; read
        `id_mappings` to recover the real variation ids.
      - `track_inventory: true` on each variation — without it Square won't
        decrement stock.
      - **Updates must carry the object's current `version`** or Square rejects them.
      - Write `squareVariationId` back to both the published doc and its draft.
      - Infer `shippingType` from the option title as a *starting point*, print
        what it inferred, and flag anything it couldn't. Never silently guess.
      - **Stock counts are a separate API** (`/v2/inventory/changes/batch-create`)
        — out of scope for this script. Set opening counts in the dashboard
        (originals = 1).
      - Use global `fetch`, not the Square SDK — avoids a new dependency for a
        one-off script. Follow the `@sanity/client` + CLI-token pattern in the
        existing `studio/scripts/`.
      - Sandbox first. Only `--apply` against production after a production dry
        run reads correctly.
- [ ] Set opening stock counts in Square (originals = 1).
- [ ] `server/` scaffold — TS, Hono or Express, `GET /api/health`, Dockerfile.
- [ ] Add the service to `docker-compose.yml`; nginx `/api/` proxy block.
- [ ] Extend the GitHub Actions deploy to build/push/restart the service.
- [ ] `src/lib/shipping.ts` (shared) — **pure function**: cart lines → shipping
      cents (PRD §9). The rule:
      ```
      shipping = sum(boxed items, per unit)
               + (any boxed item present ? 0 : highest flat rate present)
      ```
      - **Boxed** (`framedPrint`, `framedOriginal`) charged **per unit** — each
        needs its own box.
      - **Flat** (`magnet`, `postcard`, `print`, `original`) — only the **highest**
        flat rate present, charged **once**; they share one mailer.
      - Flat is **waived entirely** when any boxed item is in the cart — small flat
        items ride along in the box.
      - Local pickup is always $0.
      - Rates live in one config object, not scattered literals. Pure and
        exhaustively exercised by hand before Phase 2 ships — this is the one piece
        of money logic we own outright.
- [ ] `POST /api/checkout` — validate payload, **re-read price + stock from Square**,
      reject bad lines with per-line reasons, compute shipping, build the Order
      with catalog-referenced line items, return the hosted checkout URL.
- [ ] Wire the cart's Checkout button; render per-line rejection reasons.
- [ ] `/checkout/success` — summary, next steps, clears the cart, fires `purchase`
      once per order id, offers email signup.
- [ ] `cancel_url` → `/cart` with the cart intact.
- [ ] **Verify:** sandbox purchase of two different items, and a 3-postcard order
      charged one postcard shipping rate.

## Phase 3 — Webhooks & fulfillment

- [ ] `POST /api/square/webhook` — raw body, signature verify, ignore unknown events.
- [ ] Idempotency: record processed event ids; a replay is a no-op.
- [ ] Mirror Square stock → Sanity `soldOut`, so the static site keeps its current
      data flow.
- [ ] Order notification email to Cassandra (items, buyer, address).
- [ ] Loud failure path: Sanity mirror fails → still email, still log. Square stays
      correct regardless.
- [ ] **Verify the headline path:** sell an original on Square POS (sandbox) and
      watch it go sold on the website with no manual step.

## Phase 4 — Go live

- [ ] Production Square credentials in droplet env + GitHub secrets. Confirm no
      token in the bundle.
- [ ] Real shipping rates in config.
- [ ] **Update `siteContent.ts` shipping copy** — replacement drafted in PRD §9.
      Not before this point: the free-shipping promise is true until checkout is live.
- [ ] Retire Notion for product/inventory tracking.
- [ ] Decide Venmo's fate (PRD §17).
- [ ] File the tax follow-up issue (PRD §6).
- [ ] One real low-value purchase end to end, reconciled against Square.
- [ ] Watch the first 3 real orders before touching anything else.

---

## Notes

*(Append findings, gotchas, and decisions. Newest at the bottom. This is what a
future session reads to avoid re-deriving context.)*

- 2026-09-05 — **Platform changed Stripe → Square.** In-person markets are the
  larger channel and already run on Square POS. The real double-sale risk is
  market-vs-website, not web-vs-web, and only one system closes it. Cost is a wash:
  40¢ per $100 on ten $10 prints, against ~$4.27 saved by bundling those prints
  into one order. The cart is the cost win; the processor is noise.
- 2026-09-05 — Stripe *does* have Terminal / Tap to Pay, but no turnkey POS app for
  a market stall. Not a real option for this use case.
- 2026-09-05 — **Square auto-adjusts inventory only for line items referencing
  catalog objects** (`CatalogItemVariation`). Ad-hoc line items don't decrement
  stock. This is why the catalog must live in Square, unlike the Stripe design
  which would have priced inline.
- 2026-09-05 — Inventory adjusts on order *completion or refund*. When a paid
  online order reaches `COMPLETED` is undocumented across three doc pages — needs
  a sandbox test. POS sales complete at the point of sale, so market → website
  works; web → stock is the unknown.
- 2026-09-05 — Sanity stays the content source of truth and gets a mirrored
  `soldOut` bit, so the existing static-site data flow is preserved rather than
  teaching pages to query Square live.
- 2026-09-05 — Tax deferred against CAS-19's original plan. PA sales under-collected
  until switched on. Must be filed as a follow-up, not remembered.
- 2026-09-05 — **Shipping rule revised** once framed items and magnets entered
  scope. "Charged once per type" only holds for flat items that nest in one
  mailer; framed items each need their own box, so boxed types are charged per
  unit. Flat charges collapse to the single highest rate present, and are waived
  outright when anything boxed is in the cart. See PRD §9.
- 2026-09-05 — Seed script deliberately **not** written yet: it depends on schema
  fields that don't exist, on rates not yet verified against real labels, and on
  the Phase 0 inventory spike. Its design is captured in the Phase 2 task so the
  thinking isn't lost — read that before writing it.
