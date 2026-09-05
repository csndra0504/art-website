# Product model migration — plan

**Status:** proposed, not started · **Blocks:** CAS-34 (add to cart) and all of Phase 2
**Written:** 2026-09-05

Phase 0 turned up a data-model problem that the cart work would otherwise have
built on top of. This is the plan to fix it first. Nothing here is implemented.

> **Naming.** The subject entity keeps `_type: "artwork"` internally and gains
> the Studio display title **"Subject"**. Sanity document types can't be renamed
> in place — every doc would have to be recreated — and the `artwork-…` ids are
> referenced from the Etsy drafts. So: "Subject" everywhere a human looks,
> `artwork` everywhere code looks. The product's reference field is `subject`.

---

## 1. Why

The `artwork` document currently plays two roles at once: it is the **subject**
(images, description, medium, story, SEO) *and* the **sellable thing** (one
`originalPrice`, one `printLocalPrice`, one `printEtsyPrice`, plus a
`customOptions[]` array bolted on later to escape those limits).

That conflation is already failing, in production data:

- **Six artwork docs each back two Etsy products** — an original and a print
  sharing one subject: sphinx, Max's Allegheny Tavern, Thunderbird, PNC Park
  watercolor, Iron City Clock, North Shore skyline.
- **Cathedral of Learning has three originals and a print.** The schema has one
  `originalPrice` field, so two of the three originals cannot be represented.
  The Etsy draft for `38-cathedral-of-learning-5x7-b-original.md` documents the
  workaround: it points at the same `sanity_id` as #37, and only one of the twins
  is allowed on the website at a time.
- **47 sellable things across 38 subjects**, of which 21 are hardcoded fields
  with no `_key` — so they cannot be addressed by the cart's line identity at all.

Meanwhile the Notion workspace this business actually runs on already models it
correctly: separate `subjects` and `inventory` databases with a relation between
them, which is what makes "which subjects sell best across formats" answerable.
Square's catalog wants the same shape — one variation per sellable thing.

**Every system involved models subject→products except the website.** That is
the change.

## 2. Shape

Keep the `artwork` document as the subject. Add `product` as a first-class document.

```
artwork  — Studio title "Subject". Role unchanged, fields mostly unchanged.
  title, slug, images, description, medium, dimensions, year, tags,
  featured, sortOrder, highlightLabel, forSale

product
  subject       reference → artwork        required
  title         "5×7 Print", "Original (framed)"
  kind          original | print | postcard | magnet | sticker | other
                             Studio label "Format". Replaces customOptions[].kind,
                             which only had print|original — see §8.
  price         number, dollars
  quantity      number — opening stock; 1 for originals
  soldOut       boolean — mirrored from Square by webhook, not hand-edited
  channel       local | etsy                — etsy products are display-only
  etsyUrl       url, when channel = etsy
  squareUrl     url — legacy checkout link, retired in Phase 4
  squareVariationId  string — the catalog link (Phase 2)
  shippingType  magnet | postcard | print | original | framedSmall | framedLarge
                             (framed bands by packed weight, ≤16 oz / >16 oz)
  shipWeightOz  number     ┐ real packed figures, already recorded in the
  shipLengthIn  number     │ Etsy drafts — see §5
  shipWidthIn   number     │
  shipHeightIn  number     ┘
  subtitle      string — optional note under the price
  venmoNote     string — overrides the generated Venmo note
  visible       boolean
  sortOrder     number — display order within a subject
```

**A cart line becomes `{ productId, qty }`.** One id, mapping 1:1 to a Square
variation. The `artworkId` + `optionKey` composite goes away, and with it the
"what about the hardcoded fields" problem — they stop existing.

### Why not the alternatives

- *Migrate hardcoded fields into `customOptions`* — the plan before this. Solves
  addressability but keeps products nested inside subjects, so the Cathedral case
  (three originals) still reads as three options on one subject, weight and
  dimensions still hang off an array item, and the Notion mismatch stays.
- *Separate `artwork` docs grouped by a subject field* — no new type, but images
  and description get duplicated per product, the gallery has to de-duplicate by
  subject, and "is this row a subject or a product" becomes ambiguous in every
  query.

## 3. Blast radius

Measured against the working tree, not guessed.

| File | Change | Size |
|---|---|---|
| `studio/schemaTypes/product.ts` | new | new file |
| `studio/schemaTypes/artwork.ts` | add `title: "Subject"`; later, retire purchase fields | small |
| `studio/schemaTypes/index.ts` | register the type | 2 lines |
| `src/types/artwork.ts` | add `Product`; retire the hardcoded price fields from `Artwork` | moderate |
| `src/lib/queries.ts` | both projections; summary rollups become joins | [queries.ts:6-48](../../src/lib/queries.ts#L6-L48) |
| `src/pages/ArtworkDetail.tsx` | four purchase blocks collapse into one product list | [131-360](../../src/pages/ArtworkDetail.tsx#L131-L360), the big one |
| `src/components/ArtworkCard.tsx` | "from $X" reads products, not fields | [14-33](../../src/components/ArtworkCard.tsx#L14-L33) |
| `src/lib/structuredData.ts` | `artworkOffers()` iterates products | [43-70](../../src/lib/structuredData.ts#L43-L70) |
| `src/lib/cart.ts` | line identity → `productId` | [16-45](../../src/lib/cart.ts#L16-L45) |
| `studio/scripts/migrate-to-products.mjs` | new, one-off | new file |

**Prerendering is unaffected.** `getStaticPaths` enumerates artwork slugs
([App.tsx:18](../../src/App.tsx#L18)) and pages stay at `/artwork/<slug>`. The
loader's *shape* changes, but the existing rule still holds and must be preserved:
the page renders correctly with no loader data, then refetches on the client.

**The cart code is cheap to re-key**, because line identity is already
encapsulated behind `lineId()`. `CartDrawer.tsx` calls `lineId(line)` and reads
display fields; it needs no changes. `Layout.tsx` reads `count` and `ready` only.
That is good existing design and it is why stopping now costs little.

**Stop before CAS-34.** Add-to-cart on `ArtworkDetail` is the first task that has
to construct a cart line from a purchase option, so it is the first task that
would bake in the old identity. The drawer and header badge (CAS-33, currently
written but not browser-verified) are identity-agnostic and can be finished
independently.

## 4. Migration script

`studio/scripts/migrate-to-products.mjs`, following the `@sanity/client` +
CLI-token pattern in the existing `studio/scripts/`.

- **Dry-run by default**, `--apply` to write. It writes to live production
  content; the default must be safe.
- For each subject, emit products from:
  - `originalPrice` → one `original` product, `quantity: 1`, `kind: original`
  - `printLocalPrice` → one `print` product, `channel: local`
  - `printEtsyPrice`/`printEtsyUrl` → one `print` product, `channel: etsy`
  - each `customOptions[]` entry → one product, carrying a `_key`-derived id so a
    re-run is idempotent
- **Deterministic ids**: `product-{subject-slug}-{slugified-title}`. Re-running
  must update, never duplicate. Fail loudly on a collision within a subject
  rather than silently merging.
- Write to both the published doc and its draft, as
  `set-sphinx-lead-image.mjs` does.
- **Infer `shippingType` from the title and print what it inferred**, flagging
  anything it could not. Do not guess silently — the option titles are
  inconsistent enough to make inference unreliable (see §6).
- **Do not delete the old fields in the same run.** Land the products, verify the
  site reads correctly from them, then retire `originalPrice` / `printLocal*` /
  `printEtsy*` / `customOptions` in a follow-up commit. A migration that removes
  its own source of truth cannot be re-run.
- Backfill `shipWeightOz` and dimensions from the Etsy drafts where a
  `sanity_id` matches (§5).

**The Cathedral of Learning acceptance test was wrong — corrected 2026-09-05
after the first dry run.**

The original wording was "all three exist as separate products against one
subject". The migration cannot do that, because **two of the three do not exist
in Sanity at all**:

- **#36** (6x8, $125, active) → `artwork-cathedral-of-learning`. The only one in
  Sanity. The migration turns it into one `original` product, correctly.
- **#37** (5x7, $50, drafting) → `sanity_id` blank; would derive its own page.
- **#38** (5x7-b, $50, **HELD**) → points at `artwork-cathedral-of-learning-5x7`,
  the same page as #37, and is held because only one can occupy it.

So the three are not three originals of one subject. #36 is a 6x8 with its own
subject; **#37 and #38 are two distinct 5x7 originals meant to share one**. That
shared page is the actual conflict, and it is what the restructure fixes.

Creating the 5x7 subject and its two products is **authoring new content, not
migrating** — there is no source data to migrate from.

**Corrected acceptance test:** after the migration, create the 5x7 subject once
and add #37 and #38 as two `original` products against it. Both are sellable
simultaneously and #38 stops being held. The migration makes that *possible*; a
person still has to do it.

## 5. What this unlocks for shipping

The Etsy drafts already carry real packed weights and box dimensions per product
— data that has nowhere to live in the current schema. Moving to products gives
it a home, and it immediately contradicts the PRD §9 estimates. PRD §9 has been
corrected against it.

## 6. Known data hazards

- **Option titles are inconsistent.** Eleven distinct titles across 26 custom
  options for roughly four real product types: `5x7 Post Card`, `Loose 5x7
  Postcard`, `Loose Postcard (5x7 in)`, `Print, 5x7, Post-card` and
  `Single postcard` are all one thing. Normalise during migration, by hand, with
  the inferred value printed for review.
- **Unicode in titles.** `5×7 Print (Local Pickup)` uses U+00D7, others use `x`.
  Id slugification must handle both and must not collide.
- **Six Etsy drafts have no `sanity_id`**, so the weight backfill will not cover
  everything. Expect gaps; do not fabricate values to fill them.
- `printEtsyUrl`-derived products are **display-only** — they link out and never
  enter the cart or the Square catalog. Etsy fulfillment is untouched (PRD §3).

## 7. Sequence

1. Finish CAS-33's browser pass — it is independent, and leaving written-but-unverified
   code sitting is its own risk.
2. `product` schema + `title: "Subject"` on `artwork` + TS types.
3. Migration script, dry run, review the inferred `shippingType` output by hand.
4. `--apply`. Verify the Cathedral case.
5. Re-key `cart.ts` to `productId`.
6. Read path: queries, `ArtworkDetail`, `ArtworkCard`, `structuredData`.
7. `/verify` — typecheck, lint, build, browser pass. Confirm artwork pages still
   prerender and a page with no loader data still renders.
8. Retire the old fields in a separate commit.
9. Resume Phase 1 at CAS-34.

---

## 8. Format and the gallery "From" price

Decided 2026-09-05, while reviewing the schema in the Studio.

**The problem.** `kind` was inherited from `customOptions[].kind`, which only had
`print | original`. A magnet or sticker had no honest value to pick. Worse, `kind`
was never a taxonomy — it silently drove two behaviours:

- [queries.ts:24](../../src/lib/queries.ts#L24) — `customPrintFrom` is the cheapest
  visible option with `kind == "print"`, which sets the card's **"Prints from $X"**.
- [ArtworkDetail.tsx:361](../../src/pages/ArtworkDetail.tsx#L361) — suppresses the
  "want this as a print?" prompt.

So filing a $2 magnet under `print` would advertise **"Prints from $2"** on a piece
whose actual print is $35. A mispricing on the gallery grid, not a tidiness problem.

**The decision.** `kind` becomes a real format list — `original | print | postcard |
magnet | sticker | other`, labelled "Format" in the Studio — and the card stops
discriminating by format entirely:

> **The card shows the cheapest visible non-original product as "From $X",
> whatever format it is.** The `Original $X` line is unchanged.

No per-format pricing rule, no per-product override flag, no conditional to keep in
sync as formats are added. Adding tote bags later is a schema list edit and nothing
else.

**The tradeoff, accepted knowingly:** a $2 magnet sets the headline on a piece with
a $35 print, and "Prints from $35" is a stronger merchandising signal than
"From $2". The counter is that "own a piece of this for $2" is honest and works well
for a business that sells at markets. Mostly forward-looking — there are no magnet
or sticker products in the data yet.

**Rejected:** a free-text format field. It moves brittleness from the schema into
string matching, and this migration exists partly because eleven hand-typed titles
describe four real product types (§6). `kind === "magnet"` breaks the first time
someone types "Magnets".

**The print prompt keeps a format rule**, because it is a different question:
only `print` and `postcard` suppress it. A magnet does not satisfy someone asking
for a print. **Formats added later default to not suppressing it**, so a new product
type can never silently switch off the demand signal that tells Cassandra what to
print next.

**For the migration:** default `shippingType` from `kind` so the same fact isn't
typed twice, and correct the framed cases by hand — framed bands by packed weight,
which `kind` cannot know.
