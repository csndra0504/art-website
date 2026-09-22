# Cart & Checkout — task spine

State file for the agent loop. **Read this first, work the top unchecked task,
run `/verify`, tick it, append anything surprising to Notes.** One task ≈ one commit.

Spec: [PRD.md](PRD.md) · Plan: [product-model-migration.md](product-model-migration.md)
· Linear: [CAS-19](https://linear.app/cassandra-wilcox-art/issue/CAS-19/add-a-cart-and-square-checkout-to-the-website)
· Due 2026-11-20

**Status:** Phase 0 ✅ · Phase 0.5 ✅ (bar CAS-53 cleanup) · Phase 1 ✅ through
CAS-34 · **Last touched:** 2026-09-21 · **Platform: Square** (see PRD §5)

> ### 👉 Where things stand
>
> **In Sanity (live data):** titles normalised, De Fer copy fixed, **65 products**
> migrated with shipping bands (framed band 20 oz — PRD §9).
>
> **On branch `cart-phase-1` (not merged — the live site is unchanged):** the
> site reads products (CAS-55), and customers can add to cart (CAS-34).
>
> **Merge gate — decided 2026-09-21: hold.** `cart-phase-1` is not merged until
> checkout works end to end (CAS-41/42 at minimum). No feature flag. Until then
> the live site keeps its current purchase paths. Merge `main` into the branch
> periodically so it doesn't drift.
>
> **By hand in the Studio, when convenient:**
> - Cathedral of Learning **5x7** subject + Etsy drafts #37 and #38 as two
>   originals — the real acceptance test for the restructure.
> - William Penn Tavern **5x7 Print** and **8x10 Print**.
> - Copy the Sphinx's Etsy link (custom option "5×7 Print (Ships via Etsy)",
>   $15) onto the Sphinx subject's Etsy URL/price, before CAS-53.
> - Optional: add "Arrange pickup via email or DM" as the subtitle on the ten
>   8x10 prints — it was hardcoded on the old page and didn't carry over.
>
> **Next agent work — sandbox-first path to a working checkout:** ✅ CAS-40
> shipping calc → ✅ CAS-39 server (container-tested) → ✅ sandbox catalog mirror
> → ✅ CAS-41 checkout → ✅ CAS-42 success page. **Next:** CAS-45 shipping copy
✅ (merge blocker), then Phase 3 webhooks. CAS-37 (link to the *real*
> Square catalog, human-reviewed mapping) moves to go-live. CAS-35 and cart
> reconciliation fit in around them.

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
- [x] **Applied 2026-09-21 — 65 products.** Rename first, framed band moved to
      20 oz, then `--apply`; verified in Sanity (0 missing bands, 0 dangling
      subject refs). The hand-authored remainder is listed in the next-action
      block above. Original task text below.
- [ ] ~~Run the dry run, review inferred shipping types by hand, then `--apply`.~~
      **(CAS-50 — yours, not an agent's.)** Normalise the postcard titles first:
      they don't collide, so nothing will stop four spellings becoming four
      Square variations with split stock. Supply the 13 missing framed weights.
      **Acceptance (corrected):** the migration turns the one Cathedral original
      that exists into a product; then create the 5x7 subject by hand and add #37
      and #38 as two originals against it, so #38 stops being held. The other two
      aren't in Sanity, so no migration can produce them — see plan §4.
- [x] Re-key `src/lib/cart.ts` line identity to `productId`. **(CAS-52)** Done
      ahead of the migration — it's pure code with no data dependency. The change
      was confined to `cart.ts` as intended; `CART_VERSION` 1 → 2, so carts in the
      old shape are ignored rather than half-read. Browser-checked: an old-format
      cart shows as empty, a new-format cart renders, and the quantity stepper
      finds its line by product id and persists.
- [x] Read path: `queries.ts`, `ArtworkDetail`, `ArtworkCard`, `structuredData`
      — plus `Home.tsx`'s "For Sale" filter, which also read the legacy fields.
      **(CAS-55)** All "what's for sale" rules now live in `src/lib/offers.ts`
      so the card, filter, detail page and JSON-LD can't disagree. **On the
      branch, not merged — nothing live has changed.**
- [x] **Verify:** typecheck, lint, build (all 51 pages prerender against live
      products), browser pass at 375px, console clean. The "For Sale" set is
      **identical before and after: 34 pieces**. The Etsy rule checked on the
      prerendered HTML: hidden where local prints exist (Thunderbird, Tazza),
      shown where they don't (Cathedral, William Penn). The client refetch —
      the no-loader-data path — uses the same query and runs on every page load.
- [ ] Retire `originalPrice` / `printLocal*` / `printEtsy*` / `customOptions` —
      separate commit, after the read path is proven.

## Phase 1 — Cart, no payments

*(Independent of the platform decision — safe to start now.)*

- [x] `src/lib/cart.ts` — versioned localStorage cart: add / remove / setQty /
      clear / subtotal. Pure functions, no React. **(CAS-32)**
- [x] `src/lib/cartContext.ts` + `src/components/CartProvider.tsx` — context and
      hook split from the provider component (eslint forbids exporting both from
      one module). Mounted in `RootLayout`. SSG-safe. **(CAS-32)**
- [x] Cart reconciliation — `CartProvider.refresh()` checks the saved cart
      against published Sanity products once it loads and whenever the cart is
      opened (at most once a minute). Sold → removed, hidden/deleted/subject
      unpublished → removed, price and names refreshed; each change is stated at
      the top of the cart until dismissed. Offline → left alone (checkout
      re-checks). Against Sanity, not Square: the stock mirror keeps `soldOut`
      current, and checkout's live Square check is the backstop. Browser-tested
      with a seeded stale cart (sold original, deleted product, $8 → $10).
- [x] `src/components/CartDrawer.tsx` — Mantine Drawer in the site's square /
      hairline style. Line items, qty steppers, subtotal, empty state. **(CAS-33)**
      Browser pass done at 375px: subtotal arithmetic correct, Shipping & Returns
      sits above the Checkout button, Checkout disabled until CAS-41, console clean.
- [x] Header cart icon + count badge. Hidden at zero, and also while `ready` is
      false. **(CAS-33)** Inline SVG glyph — the header had no icon dependency and
      CLAUDE.md forbids adding one for a single glyph.
- [x] **`Add to cart` on `ArtworkDetail`. (CAS-34)** Primary action on every
      unsold product row; "or Venmo" secondary; Etsy block untouched; sold rows
      have no buttons. Replaces the per-product Square "Buy with card" links,
      which cart checkout supersedes. Disabled until the stored cart has loaded
      (an earlier tap would be overwritten), and an original already in the cart
      reads "In cart". Browser-checked end to end: add, "Added ✓", badge counts,
      qty 2 on a print, persistence across reload, drawer totals, sold row.
      ⚠️ **Checkout is still disabled until CAS-41**, so on its own this is a
      cart that can't be paid for — see Notes before merging.
- [x] One-of-a-kind items lock to qty 1. `clampQty()` in `cart.ts`; the drawer
      shows "1 only" instead of a stepper that couldn't do anything. Verified
      in-browser 2026-09-05.
- [x] `/cart` route as a full-page fallback (`src/App.tsx`) **(CAS-35)**. The
      drawer's contents moved to `CartContents`, which both use, so the two
      can't drift. Prerendered as an empty shell, noindex, not in the sitemap.
- [x] Analytics: `add_to_cart`, `remove_from_cart`, `view_cart` **(CAS-35)**.
      Add/remove fire from `CartProvider`, so every path is counted (button,
      steppers, Remove) and only real changes count — a second tap on an
      original already in the cart records nothing. `view_cart` fires on the
      header button and on `/cart`, tagged `where: drawer | page`.
- [x] **Verify:** lint/typecheck/build clean; `/cart` at 375px matches the
      drawer, checkout from it reaches Square; events checked in the browser
      (2 adds, no-op add ignored, view, decrement, remove — each exactly once).

## Phase 2 — Catalog & checkout

- [x] Sanity schema: `squareVariationId`, `shippingType`, `soldOut` on **products**
      (the fields themselves land in Phase 0.5; this task is now just the Studio
      validation). Studio warns on a sellable product with no
      variation id. `shippingType` is a required enum for anything sellable:
      `magnet` | `postcard` | `print` | `original` | `framedSmall` |
      `framedLarge` (PRD §9). Framed bands by packed weight, not contents.
      Done 2026-09-22: missing shipping type on a local product is an **error**
      (all 65 have one, so nothing breaks); missing Square id is a **warning**
      (all 65 lack one until CAS-37, so publishing isn't blocked). Etsy
      products are exempt from both. Typechecked; not yet seen in the Studio UI.
- [x] **Sandbox catalog mirror** — `scripts/seed-sandbox-catalog.mjs` (added
      2026-09-21, sandbox-first order). Copies all 64 visible products into the
      Square **sandbox** with stock (originals 1, others 10, sold 0), SKU = Sanity
      product id so re-runs update rather than duplicate. Writes the git-ignored
      `server/sandbox-catalog.json` (product → sandbox variation), which the
      checkout API reads in sandbox mode. **Sandbox ids never go into Sanity** —
      one dataset, and it's live. Verified: idempotent re-run creates nothing;
      stock read back from Square matches. Hardcoded sandbox URL, no override.
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
- [x] `server/` scaffold **(CAS-39)** — Express 5 (chosen 2026-09-21), TypeScript
      run directly by Node's type stripping (no build step), `GET /api/health`,
      port 3001 so the dormant Vite `/api` proxy (a March leftover) now reaches
      it. No global JSON parser — the CAS-43 webhook needs the raw body. Graceful
      SIGTERM shutdown. Checked by running it: health 200, unknown 404, reachable
      through the Vite proxy, exits cleanly on SIGTERM.
- [x] Compose service + nginx `/api/` block. nginx resolves the API **per
      request** (Docker DNS via a variable) so a down API can't stop nginx
      starting and take the site with it. **Container-tested 2026-09-21** with
      `docker compose up --build`: site, a prerendered artwork page and
      `/api/health` all 200 through nginx; `/events` still 200 with no redirect;
      API stopped → site 200, `/api` 502; **nginx restarted with the API down →
      booted, site 200, no `[emerg]`**; API restarted → `/api` back in ~2s with no
      nginx restart. API container runs as `node`, stops instantly on SIGTERM.
- [x] Deploy: the site's job joins a `cass-art-net` network; a new `deploy-api`
      job builds `…-api:latest` and runs `cass-art-api` on that network, **on code
      pushes only** — Sanity publishes redeploy the site and must not restart the
      API mid-checkout. Secrets from an optional `/opt/cass-art/api.env` on the
      droplet (create it in Phase 2). Workflow YAML parses. Takes effect only on
      merge to `main`.
- [x] **Done 2026-09-21 (CAS-40).** `shippingCents(lines, "ship" | "pickup")`
      with rates in one cents table. A line with no shipping type **throws**
      (`MissingShippingTypeError`, naming the products) rather than shipping
      free. Written without parameter properties so Node can run it directly —
      the checkout server shares it. `npm run check:shipping` exercises all 13
      branches incl. every PRD §9 example; `/verify` calls for it when shipping
      changes. Original task text below.
- [ ] ~~`src/lib/shipping.ts` (shared)~~ — **pure function**: cart lines → shipping
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
- [x] `POST /api/checkout` **(CAS-41, 2026-09-21)** — takes only product ids,
      quantities and ship/pickup. Re-reads products from Sanity (uncached API),
      checks **live Square stock**, rejects with one reason per line (sold out,
      only N left, one of a kind, no longer available, not buyable online yet),
      merges duplicate ids so an original can't be bought twice, computes
      shipping with the shared function (missing band → pickup-only, never
      free), creates a hosted payment link with catalog-referenced lines (so
      Square charges its catalog price and decrements stock). Pickup orders get
      a payment note so they aren't posted. Unconfigured → friendly 503, health
      unaffected. **Sandbox-tested:** 9 cases incl. rejections, stock limit,
      and a tampered `price: 0.01` ignored; orders read back from Square:
      ship $290 (incl. $20), pickup $270, tampered $13 — all exactly right.
- [x] Wire the cart's Checkout button **(CAS-41)** — ship/pickup toggle in the
      drawer (Square's hosted page takes one fee and offers no choice), live
      shipping + total preview, per-line rejection reasons, Checkout disabled
      until flagged lines are removed. Browser-tested end to end at 375px:
      totals match Square, Checkout lands on Square's sandbox page, a sold item
      is named and blocks checkout until removed.
- [x] `/checkout/success` — summary, next steps, clears the cart, fires `purchase`
      once per order id, offers email signup **(CAS-42)**. Asks `GET /api/order/:id`
      whether the order is paid before thanking anyone or clearing the cart;
      unpaid and missing states keep the cart. Browser-tested in the sandbox:
      paid $13 order confirmed, cart emptied, one `purchase` event, none on
      refresh. The pickup wording is untested in the browser (the metadata it
      reads was checked through the API).
- [x] ~~`cancel_url` → `/cart` with the cart intact.~~ Square payment links have
      no cancel URL; the buyer uses Back. The cart is only cleared on the
      success page (CAS-42), so it's intact when they return.
- [x] **Verify:** sandbox purchase of two different items, and a 3-postcard order
      charged one postcard shipping rate. Paid 2026-09-22: three 5x7s (two
      designs) = $30 − $5 deal + one $3 postcard rate = **$28**, exactly as the
      cart showed. Earlier: 3 5x7s + an 8x10 = $60 (one $5 print-band rate).

## Phase 3 — Webhooks & fulfillment

- [x] `POST /api/square/webhook` — raw body, signature verify, ignore unknown events
      **(CAS-43)**. `server/src/webhook.ts`; handlers register by event type
      (`onEvent`), and only `inventory.count.updated` is needed. Unconfigured →
      503 so Square retries; bad signature → 403; handler failure → 500 so
      Square retries. Tested locally with signed requests (9 cases). **Not yet
      tested against a real Square delivery** — that needs a public URL, so it
      happens at deploy.
- [x] Idempotency: a replay is a no-op. Done by making handlers *set* state from
      Square's current count rather than toggle it, plus an in-memory
      recent-event guard. No event store: nothing here is harmful to repeat.
- [x] Mirror Square stock → Sanity `soldOut`, so the static site keeps its current
      data flow **(CAS-44)**. `server/src/stockMirror.ts`, on
      `inventory.count.updated`. Re-reads Square's current count rather than
      trusting the event, sets `soldOut` both ways (a restock un-sells), patches
      an open draft too so publishing it can't undo a sale, and skips Square
      items the website doesn't sell. **In the sandbox it only logs** ("would
      mark … SOLD OUT"): the one Sanity dataset is live.
- [x] ~~Order notification email to Cassandra (items, buyer, address).~~
      **Dropped** — Square's own merchant emails already carry items, buyer and
      address (PRD §4). No code, and they still arrive when our webhook handler is
      the thing that's broken. Only revisit if Square's format proves inadequate.
- [x] Loud failure path: Sanity mirror fails → log loudly, answer 500 so Square
      retries (CAS-44). **Stock stays correct
      regardless** — the spike showed Square decrements on payment without us, so
      a failed mirror makes the website stale, never wrong in Square.
- [x] **Verify the headline path (sandbox half):** an available original's
      sandbox stock went 1 → 0 (as a market sale would), a signed event reached
      the webhook, and the mirror logged "would mark 16th St Bridge — Original
      SOLD OUT"; back to 1 → "already available". Market-only items and other
      locations are skipped.
- [ ] **Verify the headline path (production half), at go-live:** the Sanity
      write and the lookup by real `squareVariationId` only run in production.
      Once CAS-37 has linked the catalog, change a spare item's count in the
      Square dashboard and watch `soldOut` flip in the Studio, then put it back.

## Phase 4 — Go live

- [ ] Production Square credentials in droplet env + GitHub secrets. Confirm no
      token in the bundle.
- [ ] **Replace the estimated shipping rates with measured ones.** The Phase 0
      figures were estimates, never label-verified (PRD §9). Price three parcels
      — 7 oz framed at 9×7×1.5, 40 oz framed at 16×13×2, one weighed print in its
      rigid flat mailer — each to a near and a far zone, and reset the config.
      `print` is the weakest number: no recorded data at all for that type.
      Also check the 16 oz band threshold still falls in the right place.
- [x] ⚠️ **Must land before the branch merges.** The cart drawer now shows
      "Shipping $20" directly above "Free shipping anywhere in the US" — the
      branch contradicts itself. Under the hold-until-checkout-works plan this
      copy change ships *with* the branch, not after it.
- [x] **Update `siteContent.ts` shipping copy** — replacement drafted in PRD §9
      **(CAS-45)**. The only free-shipping claim in code; none in Sanity content.
      Venmo links charged the item price alone, so Venmo buyers shipped free
      despite the new copy. Resolved by removing Venmo (CAS-47).
- [ ] Production API env file on the droplet, `/opt/cass-art/api.env`:
      `SQUARE_ENVIRONMENT=production`, `SQUARE_ACCESS_TOKEN`,
      `SQUARE_LOCATION_ID`, `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SITE_URL`,
      `SQUARE_WEBHOOK_SIGNATURE_KEY` (and `SANITY_WRITE_TOKEN` for CAS-44).
- [ ] Sanity write token for the stock mirror: sanity.io/manage → project →
      API → Tokens → Add API token, name "cass-art-api stock mirror",
      permission **Editor**. Goes in `api.env` as `SANITY_WRITE_TOKEN`, never in
      the repo or the site build.
- [ ] Square Developer Dashboard → Webhooks → add a subscription: URL
      `https://cassandrawilcoxart.com/api/square/webhook`, event
      `inventory.count.updated`. Copy its signature key into the env file, then
      use "Send test event" to confirm a real delivery gets 200.
      Without it checkout answers "unavailable" (by design, not a crash).
      Not before this point: the free-shipping promise is true until checkout is live.
- [ ] Retire Notion for product/inventory tracking.
- [x] Decide Venmo's fate (PRD §17) **(CAS-47)** — removed from product pages,
      and the cart's error fallback now points to email.
- [x] **Buyers can't say which design they want.** Decided: one product per
      design, which already existed (11 designs each have their own $10 5x7).
      The catch-all "5x7 in Prints (various options)" page goes away; its
      "Any 3 postcards" $25 bundle becomes an automatic deal — any 3 5x7s for
      $25, mixed designs, repeating (`src/lib/discounts.ts`, checked by
      `check:shipping`). Applied as a Square discount on the 5x7 lines only.
      Sandbox-verified end to end: 3 5x7s + an 8x10 shipped = $60, deal shown
      in the drawer and on the confirmation. Dippy's 5x7 was already one
      design; its "which print" note was stale.
- [ ] ⚠️ **On merge day, not before** (the live site still sells through the
      catch-all today): in the Studio, unpublish the "5x7 in Prints (various
      options)" subject, and set both its products to hidden ("5x7 Print" and
      "Any 3 postcards"). Hiding the products also matters for money: the $25
      bundle is in the postcard band, so while buyable it would count toward
      the deal.
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
- 2026-09-21 — **Decisions from reviewing the dry run against the real Square
  catalog** (read-only; nothing written to Sanity or Square):
  - **Square already holds the whole range** — 34 items / 45 variations, built by
    hand, with Square-generated SKUs, real stock counts and sold-out flags. The
    CAS-37 design (match on a `CW-…` SKU, create what's missing) would have
    matched nothing and **duplicated almost everything**, splitting stock and
    orphaning sales history. **CAS-37 must link each product to its existing
    Square variation and create only what's genuinely new.** Names don't line up
    exactly ("Kennywod Dog & Beer", "PGH Skyline"), so the mapping needs review.
  - **Sync direction is Sanity → Square.** Products and prices are created and
    edited in the Studio; Square owns stock counts. One place to edit price, or
    the two drift. First version is a re-runnable sync command; later the
    Phase 2 server runs it automatically on a Sanity publish webhook.
  - **Etsy links are not products.** No stock, never in the cart, never in
    Square. They stay on the subject (`printEtsyUrl`/`printEtsyPrice`) as a
    fallback for pieces with no print on hand — so CAS-53 keeps those two fields
    rather than retiring them. Display rule for CAS-55: show the Etsy button only
    when the subject has no local print for sale. Migration: 82 → 65 products.
    The Sphinx's Etsy link lives only in a custom option — copy it onto the
    subject before customOptions is retired, or it's lost.
  - **The legacy $30 "local pickup" prints are 8x10s**; migrated as "8x10 Print".
  - **William Penn Tavern** now has 5x7 and 8x10 prints on hand. Not on the site
    or in Square yet — add by hand in the Studio after the migration.
  - **Parked: the Sphinx original.** In Square at $150, deliberately absent from
    the site because of minor water damage. Revisit separately.
  - Migration re-runs no longer overwrite existing products (`--force` to opt
    in), so Studio edits to weights, bands and Square ids survive.
- 2026-09-21 — **Merge gate for `cart-phase-1`.** After CAS-34 the branch has a
  working cart but a disabled Checkout (CAS-41 is Phase 2), and the rows no
  longer show the old Square "Buy with card" links. Merged as-is, customers
  could fill a cart they can't pay for, and card buyers would lose their path.
  Options: hold the whole branch until checkout works; or put the cart behind a
  flag (hide cart icon + Add to cart, restore the Square links) so the CAS-55
  read path — which is safe and verified on its own — can ship now.
- 2026-09-21 — **Merge gate decided: option A, hold the branch** until checkout
  works. Rejected: a feature flag to ship the CAS-55 read path early. Cost
  accepted: the read-path improvements wait, and the branch must be kept in step
  with `main`.
- 2026-09-21 — **Sandbox-first for checkout.** CAS-41/42 are built and tested
  against the Square sandbox, using a mirror of the site's products. Linking
  to the real Square catalog (CAS-37) waits for go-live, so production
  credentials stay off the machine until they're needed. The API picks its
  variation ids by environment: the sandbox map in sandbox, each product's
  `squareVariationId` in production.
- 2026-09-21 — **Never update a payment link that has a `shipping_fee`.** Square
  adds the fee to the order again on *every* link update, even one whose
  `checkout_options` leave it out. The update that points the redirect at
  `?orderId=` turned a $13 order into $16 (two "Shipping" charges). The earlier
  $13/$270/$290 checks predate that update, so they didn't catch it. Fix:
  shipping is now an order `service_charge` named "Shipping", and the link update
  only touches the redirect. Sandbox-verified: $13 before and after the update.
  The Square sandbox panel doesn't redirect on its own; it shows the return URL
  as a link.
- 2026-09-21 — **Venmo removed** from product pages before go-live. It charged
  the item price with no shipping, so after CAS-45 it contradicted the site's
  own copy. It also carried something the cart can't yet do: two "pick your
  design" products asked for the choice in the Venmo note. The `venmoNote`
  field and its data stay until that has a replacement.
- 2026-09-21 — **Square discounts: scope them to lines.** An `ORDER`-scoped
  fixed discount is spread over every line, so a 3-for-$25 deal showed $2.50 off
  an 8x10 in the same cart; Square's item reports would call 8x10s discounted.
  A `LINE_ITEM` discount with `applied_discounts` on the 5x7 lines takes the
  amount once, split across just those lines. Discounts are order fields, so
  unlike `shipping_fee` they survive the redirect update.
- 2026-09-21 — Checked the real Square account for a 3-for-$25 pricing rule to
  reuse: there isn't one (only WELCOME10). At markets the deal is applied by
  hand; the website's rule lives in our code, like shipping.
- 2026-09-21 — **Webhook idempotency without a database.** CAS-43 asked to record
  processed event ids. The API has no storage, and the only handler (the stock
  mirror) writes Sanity's `soldOut` from Square's *current* count, so running it
  twice gives the same result. An in-memory set skips obvious repeats, and losing
  it on restart is harmless. If a handler ever does something that isn't safe to
  repeat (an email, say), that's when it needs a real event store.
- 2026-09-21 — **The stock mirror doesn't write in the sandbox.** There's one
  Sanity dataset and it's live, so a sandbox test sale writing `soldOut` would
  mark the real piece sold on the real site. Sandbox mode logs the change it
  would make instead. A separate test dataset was the alternative; not worth the
  setup while the log shows the whole chain working.
