# Cart & Checkout — task spine

State file for the agent loop. **Read this first, work the top unchecked task,
run `/verify`, tick it, append anything surprising to Notes.** One task ≈ one commit.

Spec: [PRD.md](PRD.md) · Plan: [product-model-migration.md](product-model-migration.md)
· Linear: [CAS-19](https://linear.app/cassandra-wilcox-art/issue/CAS-19/add-a-cart-and-square-checkout-to-the-website)
· Due 2026-11-20

**Status:** Phase 0 complete · Phase 1 done through CAS-33 · **Phase 0.5 in
progress** · **Last touched:** 2026-09-08 · **Platform: Square** (see PRD §5)

> ### 👉 Next action — a human's, not an agent's
>
> **Nothing has been written to Sanity yet.** The product schema, the Studio desk
> structure, and both scripts are committed, but every run so far has been a dry
> run. Two scripts need applying, in this order:
>
> ```bash
> node studio/scripts/normalize-option-titles.mjs           # review first
> node studio/scripts/normalize-option-titles.mjs --apply   # 24 edits
> node studio/scripts/migrate-to-products.mjs --titles      # expect 5 titles
> node studio/scripts/migrate-to-products.mjs               # full review
> node studio/scripts/migrate-to-products.mjs --apply       # ~82 products
> ```
>
> **Order matters.** Product ids derive from the legacy title, so a rename after
> migrating gets rebuilt from the old title and silently reverted.
>
> Before `--apply` on the migration, decide the two open items in CAS-50: the
> 13 framed prints with no packed weight, and whether the framed band should
> move off exactly 16 oz (the one measured value, 458 g, is 16.16 oz — over the
> line, but recorded as 16, so it lands in the cheap band).
>
> After that, agent work resumes at **CAS-52** (re-key cart to `productId`),
> then **CAS-55** (read path). CAS-34 stays blocked until both land.

> Linear is the source of truth for status. This file is the loop's working
> memory — keep both ticked.

**Linear issues** (all sub-issues of CAS-19, project *Website cart & checkout*):

| | Issue |
|---|---|
| Phase 0 | CAS-29 inventory spike · CAS-30 shipping rates · CAS-31 credentials |
| Phase 0.5 | CAS-51 product type ✅ · CAS-49 migration script · CAS-50 review + apply · CAS-52 re-key cart · CAS-55 read path · CAS-53 retire legacy fields |
| Phase 1 | CAS-32 cart state · CAS-33 drawer + badge · CAS-34 add to cart · CAS-35 /cart + analytics |
| Phase 2 | CAS-36 schema · CAS-37 seed script · CAS-38 stock counts · CAS-39 server scaffold · CAS-40 shipping calc · CAS-41 /api/checkout · CAS-42 success page |
| Phase 3 | CAS-43 webhook verify · CAS-44 stock mirror + order email |
| Phase 4 | CAS-45 shipping copy · CAS-46 go live · CAS-47 Venmo decision |
| Post-launch | CAS-48 turn on PA sales tax |

PRD document: <https://linear.app/cassandra-wilcox-art/document/prd-cart-and-square-checkout-2a83e6d0a599>

> **CAS-30 is open on purpose.** Retitled to "Verify shipping rates against real
> labels (Phase 4)". Rates were estimated, not measured — closing it would erase
> the fact that real customers get charged unverified postage.

---

## Phase 0 — Spikes & decisions (human-ish, blocks Phase 2)

- [x] **Spike: does a paid online Square order auto-complete and decrement stock?**
      **Answered 2026-09-05 — the question's premise was wrong.** Stock decrements
      on *payment*, not on completion: 3 → 2 about six seconds after paying, with
      the order still `OPEN` and its fulfillment `SHIPMENT:PROPOSED`. Nothing has
      to reach `COMPLETED`. Result in
      [spike-inventory-result.md](spike-inventory-result.md); consequences in
      PRD §7. **Phase 3 gets simpler** — the webhook only mirrors, never completes.
- [x] **Shipping rates set.** Real labels deliberately **not** priced — Cassandra
      estimated instead (2026-09-05): framed small $10, framed large $20, print
      $5; magnet $2 / postcard $3 / original $10 unchanged. Framed now bands by
      packed weight (≤16 oz / >16 oz) rather than by frame contents, so the enum
      is `framedSmall` | `framedLarge`. **These are estimates charged to real
      customers** — verification moved to Phase 4 below, not dropped.
- [x] Update CAS-19 in Linear: title and body still say Stripe. **Already done** —
      retitled "Add a cart and Square Checkout to the website" on 2026-09-05,
      body rewritten for Square, tax deferral and the §9 shipping rule.
- [x] Decide how the Square catalog gets seeded — **migration script from Sanity.**
      47 variations, each needing its Square id written back; hand entry is 94
      manual steps with no re-run when a price changes.
- [x] Square sandbox credentials + location ID in hand. Token in `.env`; sandbox
      location `LSPHEJWF41H18` ("Default Test Account"). Production credentials
      are a separate Phase 4 task.
- [x] Sanity token with write access, for the stock mirror. Personal CLI token is
      present at `~/.config/sanity/config.json` (key `authToken`) and covers the
      migration scripts. **The deployed mirror needs a different one**: a project
      token with Editor rights from sanity.io/manage, since a service must not
      depend on a human's login session. Not needed until Phase 3.
- [x] Answer the rest of PRD §17. Order email → Square's own (drops a Phase 3
      task). Returns → keep "all sales final", worded as policy. Venmo, tax and
      Notion deliberately deferred to CAS-47 / CAS-48 / Phase 4.

## Phase 0.5 — Product model restructure (blocks CAS-34 and all of Phase 2)

*Plan: [product-model-migration.md](product-model-migration.md). Found during
Phase 0; the cart would otherwise have been built on a model that can't represent
the actual stock.*

- [x] `studio/schemaTypes/product.ts` — `product` doc referencing an `artwork`
      subject. Add `title: "Subject"` to the artwork type while there. **(CAS-51)**
      Registered in `index.ts`; `soldOut` is `readOnly` in the Studio since the
      webhook owns it; the legacy fieldset is retitled "(legacy — moving to
      Products)" so it's obvious which half is dying. `sanity build` passes, so
      the schema loads.
- [x] TS types in `src/types/artwork.ts`. **(CAS-51)** `Product`,
      `ProductWithSubject`, `ProductKind`, `ProductChannel`, `ShippingType`.
      Legacy types kept below a divider comment, not yet deleted.
- [x] `studio/scripts/migrate-to-products.mjs` — dry-run by default, deterministic
      ids, prints its inferred `shippingType` for review. Does **not** delete the
      old fields in the same run. **(CAS-49)** Dry run exercised against real
      data: 82 products / 45 subjects, 0 id collisions, 13 framed prints with no
      packed weight. Findings in Notes and CAS-50.
- [ ] Run the dry run, review inferred shipping types by hand, then `--apply`.
      **(CAS-50 — yours, not an agent's.)** Normalise the postcard titles first:
      they don't collide, so nothing will stop four spellings becoming four
      Square variations with split stock. Supply the 13 missing framed weights.
      **Acceptance (corrected):** the migration turns the one Cathedral original
      that exists into a product; then create the 5x7 subject by hand and add #37
      and #38 as two originals against it, so #38 stops being held. The other two
      aren't in Sanity, so no migration can produce them — see plan §4.
- [ ] Re-key `src/lib/cart.ts` line identity to `productId`.
- [ ] Read path: `queries.ts`, `ArtworkDetail`, `ArtworkCard`, `structuredData`.
- [ ] **Verify:** `/verify` clean, artwork pages still prerender, a page with no
      loader data still renders.
- [ ] Retire `originalPrice` / `printLocal*` / `printEtsy*` / `customOptions` —
      separate commit, after the read path is proven.

## Phase 1 — Cart, no payments

*(Independent of the platform decision — safe to start now.)*

- [x] `src/lib/cart.ts` — versioned localStorage cart: add / remove / setQty /
      clear / subtotal. Pure functions, no React. **(CAS-32)**
- [x] `src/lib/cartContext.ts` + `src/components/CartProvider.tsx` — context and
      hook split from the provider component (eslint forbids exporting both from
      one module). Mounted in `RootLayout`. SSG-safe. **(CAS-32)**
- [~] Cart reconciliation on load — `reconcileCart()` exists in `cart.ts` as a
      pure function taking a status resolver. **Not yet wired**: needs real
      availability data, which arrives with the Square catalog in Phase 2. Wire
      it in CAS-34 against Sanity, then repoint at Square.
- [x] `src/components/CartDrawer.tsx` — Mantine Drawer in the site's square /
      hairline style. Line items, qty steppers, subtotal, empty state. **(CAS-33)**
      Browser pass done at 375px: subtotal arithmetic correct, Shipping & Returns
      sits above the Checkout button, Checkout disabled until CAS-41, console clean.
- [x] Header cart icon + count badge. Hidden at zero, and also while `ready` is
      false. **(CAS-33)** Inline SVG glyph — the header had no icon dependency and
      CLAUDE.md forbids adding one for a single glyph.
- [ ] 🛑 **`Add to cart` on `ArtworkDetail` options. BLOCKED on Phase 0.5.** This
      is the first task that builds a cart line from a purchase option, so it is
      the first that would bake in the old `artworkId` + `optionKey` identity.
      Everything above it is identity-agnostic and safe to finish. Venmo stays
      secondary, Etsy options untouched, suppressed on sold-out items.
- [x] One-of-a-kind items lock to qty 1. `clampQty()` in `cart.ts`; the drawer
      shows "1 only" instead of a stepper that couldn't do anything. Verified
      in-browser 2026-09-05.
- [ ] `/cart` route as a full-page fallback (`src/App.tsx`).
- [ ] Analytics: `add_to_cart`, `remove_from_cart`, `view_cart`.
- [ ] **Verify:** `/verify` clean, drawer usable at 375px, cart survives reload.

## Phase 2 — Catalog & checkout

- [ ] Sanity schema: `squareVariationId`, `shippingType`, `soldOut` on **products**
      (the fields themselves land in Phase 0.5; this task is now just the Studio
      validation). Studio warns on a sellable product with no
      variation id. `shippingType` is a required enum for anything sellable:
      `magnet` | `postcard` | `print` | `original` | `framedSmall` |
      `framedLarge` (PRD §9). Framed bands by packed weight, not contents.
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
      - **Boxed** (`framedSmall`, `framedLarge`) charged **per unit** — each
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
- [x] ~~Order notification email to Cassandra (items, buyer, address).~~
      **Dropped** — Square's own merchant emails already carry items, buyer and
      address (PRD §4). No code, and they still arrive when our webhook handler is
      the thing that's broken. Only revisit if Square's format proves inadequate.
- [ ] Loud failure path: Sanity mirror fails → log loudly. **Stock stays correct
      regardless** — the spike showed Square decrements on payment without us, so
      a failed mirror makes the website stale, never wrong in Square.
- [ ] **Verify the headline path:** sell an original on Square POS (sandbox) and
      watch it go sold on the website with no manual step.

## Phase 4 — Go live

- [ ] Production Square credentials in droplet env + GitHub secrets. Confirm no
      token in the bundle.
- [ ] **Replace the estimated shipping rates with measured ones.** The Phase 0
      figures were estimates, never label-verified (PRD §9). Price three parcels
      — 7 oz framed at 9×7×1.5, 40 oz framed at 16×13×2, one weighed print in its
      rigid flat mailer — each to a near and a far zone, and reset the config.
      `print` is the weakest number: no recorded data at all for that type.
      Also check the 16 oz band threshold still falls in the right place.
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
- 2026-09-05 — ~~Inventory adjusts on order *completion or refund*.~~ **Wrong, and
  the spike proved it.** Stock decremented ~6s after payment with the order still
  `OPEN` and fulfillment `SHIPMENT:PROPOSED`. Completion is irrelevant to stock on
  the online path. The docs' "completed or refunded" language sent this design
  down a branch that didn't exist — worth remembering that the Square docs
  describe the POS lifecycle and quietly generalise it. Untested: whether a refund
  or a cancelled `OPEN` order returns stock. Verify before go-live.
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
- 2026-09-05 — **CAS-32 done.** Two things worth knowing for the rest of Phase 1:
  - `cartContext` had to split in two. A module exporting both a component and a
    hook trips `react-refresh/only-export-components`, which is an eslint *error*
    here, not a warning. Context + `useCart()` live in `src/lib/cartContext.ts`;
    the provider is `src/components/CartProvider.tsx`. Follow that split for any
    future provider.
  - The cart is deliberately **empty on first client render** and hydrates in an
    effect, because reading `localStorage` during render would mismatch the
    prerendered HTML. Consumers must key off `ready`, and the header badge must
    hide at zero — for one frame after load every visitor's cart looks empty.
- 2026-09-05 — Seed script deliberately **not** written yet: it depends on schema
  fields that don't exist, on rates not yet verified against real labels, and on
  the Phase 0 inventory spike. Its design is captured in the Phase 2 task so the
  thinking isn't lost — read that before writing it.
- 2026-09-05 — **The purchase-option model doesn't survive contact with the data.**
  38 subjects carry 47 sellable things, but 21 of them are hardcoded fields
  (`originalPrice`, `printLocalPrice`) with no `_key`, so the cart's
  `artworkId:optionKey` identity can't address them at all. Worse, six subjects
  already back two Etsy products each, and Cathedral of Learning has three
  originals against a schema with one `originalPrice` field — draft #38 is
  literally held back from the website as the workaround. Notion already models
  this correctly (`subjects` ⟷ `inventory` as related DBs) and so does Square's
  catalog. Hence Phase 0.5.
- 2026-09-05 — Naming: the subject entity keeps `_type: "artwork"` and gains the
  Studio title **"Subject"**. Sanity types can't be renamed in place — every doc
  would be recreated — and `artwork-…` ids are referenced from the Etsy drafts.
- 2026-09-05 — **PRD §9's framed weights were wrong, in the expensive direction.**
  The Etsy drafts record real packed weights: framed items run 7–40 oz, nine of
  eleven at or under 1 lb, in boxes from 9×7×1.5 to 16×13×2. The PRD assumed
  2–4 lb. A flat $25 on the most common framed parcel (7 oz) overcharges roughly
  3×. Framed types need weight bands, not one flat rate. Separately, **the 25
  print drafts record no shipping data at all**, so the `print` rate is a pure
  guess — and prints are what the cart is most meant to bundle.
- 2026-09-05 — Those drafts are a better source than expected: per-product weight,
  box dimensions, price, quantity and a `sanity_id` link. Worth backfilling into
  the new `product` docs rather than re-measuring. Six drafts have no `sanity_id`,
  so expect gaps.
- 2026-09-05 — Cart identity is encapsulated behind `lineId()`, so `CartDrawer`
  and `Layout` need no changes when it becomes `productId`. Stopping the cart
  work now is cheap precisely because of that; it would not have been in two weeks.
- 2026-09-05 — The `GMAIL_USER` / `GMAIL_APP_PASSWORD` / `PORT` entries in `.env`
  are dead — there is no Express server in the repo and `docker-compose.yml` has
  only the `app` service. Phase 2's `server/` scaffold is genuinely greenfield.
- 2026-09-05 — **Shipping rates are estimates, by choice.** Cassandra opted not to
  create shipping accounts to price real labels, and set framed small $10 / framed
  large $20 / print $5 from judgement. That's a deliberate trade of accuracy for
  speed, and it unblocks Phase 2 — but the numbers get charged to real customers,
  so a low estimate comes out of each sale. Re-priced in Phase 4. The framed split
  also changed shape as a result: bands by packed weight (≤16 oz / >16 oz) rather
  than `framedPrint` / `framedOriginal`, because cost tracks weight, not contents.
  Keep the threshold in the rate table, never on the product, so it can move
  without re-tagging anything.
- 2026-09-05 — `scripts/square-inventory-spike.mjs` written and ready. Sandbox
  base URL is hardcoded with no override on purpose: it creates catalog objects
  and sets inventory counts, neither of which should ever touch live data. It
  writes its verdict to `docs/cart-checkout/spike-inventory-result.md`.
- 2026-09-05 — **Migration dry run, first real exercise.** Three things the plan
  did not predict:
  - **The Cathedral acceptance test was unachievable.** Two of the three
    originals aren't in Sanity at all — #37 and #38 are two distinct 5x7 pieces
    meant to share one page, which is *why* #38 is held. Creating them is
    authoring, not migrating. Plan §4 corrected.
  - **Weight backfill was stamping a framed original's packed weight onto that
    subject's postcards** (a postcard at 40 oz). Etsy drafts describe one
    product; they're keyed to a subject. Weights now attach only when
    unambiguous — matched count dropped 16 → 7. A missing weight is visible; a
    wrong one silently misprices postage.
  - **The framed band boundary is fragile.** `framedSmall`/`framedLarge` splits
    at exactly 16 oz, which is where most recorded weights sit, several marked
    `[confirm]`. The one measured value is `458 g` = **16.16 oz** — over the line
    — but recorded as `16`, so it lands in `framedSmall` and undercharges $10.
    Worth moving the boundary to ~20 oz so rounding can't flip it.
  - Also: **82 products across 45 subjects**, against the plan's estimate of 47
    across 38. Worth confirming that's real and not double-counting.
