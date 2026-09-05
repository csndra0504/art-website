import { createClient } from "@sanity/client";
import { homedir } from "node:os";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Migrate the legacy purchase fields on `artwork` into first-class `product`
// documents. See docs/cart-checkout/product-model-migration.md.
//
//   node studio/scripts/migrate-to-products.mjs            # dry run, writes nothing
//   node studio/scripts/migrate-to-products.mjs --apply    # create/update products
//
// Dry run is the default because this writes to live production content.
//
// It deliberately does NOT delete the legacy fields. A migration that removes
// its own source of truth can only be run once, and this one is meant to be
// re-run as titles get normalised.

const APPLY = process.argv.includes("--apply");
// Grouping by title rather than by subject is what makes near-duplicate titles
// visible. They don't collide on id, so nothing stops four spellings of
// "postcard" becoming four Square variations with the stock split between them.
const TITLES_ONLY = process.argv.includes("--titles");

const ETSY_DRAFTS =
  process.env.ETSY_DRAFTS_DIR ??
  "/Users/cassandrawilcox/Development/artbizhq/projects/etsy/drafts";

const { authToken } = JSON.parse(
  readFileSync(join(homedir(), ".config/sanity/config.json"), "utf8")
);

const client = createClient({
  projectId: "p96btff4",
  dataset: "production",
  apiVersion: "2023-05-01",
  token: authToken,
  useCdn: false,
});

// ---------------------------------------------------------------------------
// Shipping type inference.
//
// A starting point for human review, never a silent decision. Titles are
// inconsistent enough (eleven spellings for four real products) that anything
// unmatched must surface rather than default.
// ---------------------------------------------------------------------------

// The framed band splits at 16 oz — and 16 is exactly where most of the recorded
// weights sit, several of them still marked "[confirm]". A packed frame that
// weighs a shade over rounds down to 16 in the drafts and would ship as
// framedSmall, undercharging by $10. So anything at the boundary is flagged for
// a real measurement rather than assigned.
const FRAMED_BAND_OZ = 16;

function inferShippingType({ title, kind, weightOz }) {
  const t = title.toLowerCase();

  if (/magnet/.test(t)) return { type: "magnet" };
  if (/sticker/.test(t)) return { type: "sticker" };
  if (/post\s*-?\s*card/.test(t)) return { type: "postcard" };

  if (/framed|frame\b/.test(t)) {
    if (weightOz == null) {
      return {
        type: null,
        why: "framed, but no packed weight — the band can't be chosen without one",
      };
    }
    if (weightOz === FRAMED_BAND_OZ) {
      return {
        type: null,
        why: `framed at exactly ${FRAMED_BAND_OZ} oz — sits on the band boundary, needs weighing`,
      };
    }
    return {
      type: weightOz < FRAMED_BAND_OZ ? "framedSmall" : "framedLarge",
      why: `framed, ${weightOz} oz`,
    };
  }

  if (kind === "original") return { type: "original" };
  if (kind === "print") return { type: "print" };
  return { type: null, why: "no rule matched this title" };
}

// ---------------------------------------------------------------------------
// Etsy drafts — packed weights and box dimensions live only here.
//
// Only a minority of drafts carry them, and `sanity_id` is inconsistent: some
// hold a document _id, others a slug. Index both and look up by either.
// ---------------------------------------------------------------------------

function parseFrontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!match) return null;
  const out = {};
  for (const line of match[1].split("\n")) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    // Strip trailing "# ..." notes; several carry "[confirm]" caveats we want
    // to keep visible in the report rather than silently drop.
    const rawValue = kv[2];
    const hashAt = rawValue.indexOf("#");
    out[kv[1]] = {
      value: (hashAt === -1 ? rawValue : rawValue.slice(0, hashAt)).trim(),
      note: hashAt === -1 ? "" : rawValue.slice(hashAt + 1).trim(),
    };
  }
  return out;
}

function loadEtsyShipping() {
  const bySanityId = new Map();
  if (!existsSync(ETSY_DRAFTS)) {
    console.log(`⚠ Etsy drafts not found at ${ETSY_DRAFTS} — skipping weight backfill.\n`);
    return bySanityId;
  }
  for (const file of readdirSync(ETSY_DRAFTS).filter((f) => f.endsWith(".md"))) {
    const fm = parseFrontmatter(readFileSync(join(ETSY_DRAFTS, file), "utf8"));
    if (!fm?.sanity_id?.value || !fm.ship_weight_oz?.value) continue;
    const num = (k) => {
      const v = fm[k]?.value;
      const n = v == null ? NaN : Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    bySanityId.set(fm.sanity_id.value, {
      file,
      type: fm.type?.value,
      shipWeightOz: num("ship_weight_oz"),
      shipLengthIn: num("ship_length_in"),
      shipWidthIn: num("ship_width_in"),
      shipHeightIn: num("ship_height_in"),
      unconfirmed: /confirm/i.test(fm.ship_weight_oz.note ?? ""),
      note: fm.ship_weight_oz.note ?? "",
    });
  }
  return bySanityId;
}

// ---------------------------------------------------------------------------

// A draft's packed weight describes ONE product, but drafts are keyed to a
// subject. Attaching it to every product on that subject stamped a framed
// original's 40 oz onto its postcards. So only attach when the match is
// unambiguous: the draft is for an original, this product is that original, and
// the subject has exactly one. Everything else is left blank and flagged —
// a missing weight is visible, a wrong one silently misprices postage.
function shipFor(spec, ship, originalCount) {
  if (!ship || ship.type !== "original") return null;
  if (spec.kind !== "original" || originalCount !== 1) return null;
  return ship;
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/×/g, "x") // U+00D7 and "x" both appear in titles; must not diverge
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const artworks = await client.fetch(
  `*[_type == "artwork" && !(_id in path("drafts.**"))]{
     _id, title, "slug": slug.current, forSale,
     originalPrice, originalSold, originalSquareUrl,
     printLocalPrice, printLocalSold,
     printEtsyPrice, printEtsyUrl,
     customOptions
   } | order(title asc)`
);

const etsyShipping = loadEtsyShipping();

const products = [];
const collisions = [];
const needsReview = [];

for (const art of artworks) {
  if (!art.slug) {
    needsReview.push({ subject: art.title, issue: "no slug — skipped entirely" });
    continue;
  }

  const subjectShip = etsyShipping.get(art._id) ?? etsyShipping.get(art.slug) ?? null;
  const seen = new Map();

  // How many originals this subject yields, so a weight is only attached when
  // there's exactly one candidate for it.
  const originalCount =
    (art.originalPrice != null ? 1 : 0) +
    (art.customOptions ?? []).filter((o) => o.kind === "original" && o.price != null)
      .length;

  const emit = (spec) => {
    const id = `product-${art.slug}-${slugify(spec.title)}`;
    if (seen.has(id)) {
      // Two options on one subject slugging to the same id means their titles
      // are effectively duplicates. Fail loudly — merging them silently would
      // fuse two different products into one Square variation.
      collisions.push({
        subject: art.title,
        id,
        titles: [seen.get(id), spec.title],
      });
      return;
    }
    seen.set(id, spec.title);

    const ship = shipFor(spec, subjectShip, originalCount);
    const inferred = inferShippingType({
      title: spec.title,
      kind: spec.kind,
      weightOz: ship?.shipWeightOz,
    });
    if (!inferred.type) {
      needsReview.push({
        subject: art.title,
        product: spec.title,
        issue: inferred.why,
      });
    }

    products.push({
      _id: id,
      _type: "product",
      subject: { _type: "reference", _ref: art._id },
      title: spec.title,
      kind: spec.kind,
      price: spec.price,
      quantity: spec.quantity ?? (spec.kind === "original" ? 1 : 0),
      soldOut: spec.soldOut ?? false,
      channel: spec.channel,
      ...(spec.etsyUrl ? { etsyUrl: spec.etsyUrl } : {}),
      ...(spec.squareUrl ? { squareUrl: spec.squareUrl } : {}),
      ...(spec.subtitle ? { subtitle: spec.subtitle } : {}),
      ...(spec.venmoNote ? { venmoNote: spec.venmoNote } : {}),
      ...(inferred.type ? { shippingType: inferred.type } : {}),
      ...(ship?.shipWeightOz != null ? { shipWeightOz: ship.shipWeightOz } : {}),
      ...(ship?.shipLengthIn != null ? { shipLengthIn: ship.shipLengthIn } : {}),
      ...(ship?.shipWidthIn != null ? { shipWidthIn: ship.shipWidthIn } : {}),
      ...(ship?.shipHeightIn != null ? { shipHeightIn: ship.shipHeightIn } : {}),
      visible: spec.visible ?? true,
      sortOrder: spec.sortOrder,
      _shipSource: ship?.file,
      _shipUnconfirmed: ship?.unconfirmed ?? false,
    });
  };

  if (art.originalPrice != null) {
    emit({
      title: "Original",
      kind: "original",
      price: art.originalPrice,
      quantity: 1,
      soldOut: art.originalSold === true,
      channel: "local",
      squareUrl: art.originalSquareUrl,
      sortOrder: 0,
    });
  }
  if (art.printLocalPrice != null) {
    emit({
      title: "Print (local pickup)",
      kind: "print",
      price: art.printLocalPrice,
      soldOut: art.printLocalSold === true,
      channel: "local",
      sortOrder: 10,
    });
  }
  if (art.printEtsyPrice != null || art.printEtsyUrl) {
    emit({
      title: "Print (Etsy)",
      kind: "print",
      price: art.printEtsyPrice ?? 0,
      channel: "etsy",
      etsyUrl: art.printEtsyUrl,
      sortOrder: 20,
    });
  }
  (art.customOptions ?? []).forEach((opt, i) => {
    if (opt.price == null || !opt.title) {
      needsReview.push({
        subject: art.title,
        product: opt.title ?? "(untitled option)",
        issue: "no price or no title — skipped",
      });
      return;
    }
    emit({
      title: opt.title,
      kind: opt.kind === "original" ? "original" : "print",
      price: opt.price,
      channel: opt.etsyUrl ? "etsy" : "local",
      etsyUrl: opt.etsyUrl,
      squareUrl: opt.squareUrl,
      subtitle: opt.subtitle,
      venmoNote: opt.venmoNote,
      visible: opt.visible !== false,
      sortOrder: 30 + i,
    });
  });
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(`\nSubjects read:        ${artworks.length}`);
console.log(`Products to write:    ${products.length}`);
console.log(`Weight data matched:  ${products.filter((p) => p._shipSource).length}`);
console.log(`Needs review:         ${needsReview.length}`);
console.log(`Id collisions:        ${collisions.length}\n`);

if (TITLES_ONLY) {
  const byTitle = new Map();
  for (const p of products) {
    const g = byTitle.get(p.title) ?? { count: 0, prices: new Set(), types: new Set() };
    g.count++;
    g.prices.add(p.price);
    g.types.add(p.shippingType ?? "⚠ none");
    byTitle.set(p.title, g);
  }
  console.log("— Distinct titles, most used first —");
  console.log("  Titles meaning the same product should be spelled the same.\n");
  for (const [title, g] of [...byTitle].sort((a, b) => b[1].count - a[1].count)) {
    const prices = [...g.prices].sort((a, b) => a - b);
    const priceLabel =
      prices.length === 1 ? `$${prices[0]}` : `$${prices[0]}–$${prices.at(-1)}`;
    console.log(
      `  ${String(g.count).padStart(3)}  ${title.padEnd(52)} ${priceLabel.padEnd(10)} ${[...g.types].join(", ")}`
    );
  }
  console.log("\nRe-run without --titles for the full per-subject listing.\n");
  process.exit(0);
}

console.log("— Products —");
let lastSubject = null;
for (const p of products) {
  const subject = artworks.find((a) => a._id === p.subject._ref)?.title;
  if (subject !== lastSubject) {
    console.log(`\n  ${subject}`);
    lastSubject = subject;
  }
  const bits = [
    `$${p.price}`,
    p.kind,
    p.channel === "etsy" ? "etsy" : null,
    p.shippingType ?? "⚠ NO SHIPPING TYPE",
    p.shipWeightOz != null
      ? `${p.shipWeightOz}oz${p._shipUnconfirmed ? " (unconfirmed)" : ""}`
      : null,
    p.visible === false ? "hidden" : null,
    p.soldOut ? "sold" : null,
  ].filter(Boolean);
  console.log(`    ${p.title.padEnd(34)} ${bits.join(" · ")}`);
  console.log(`      ${p._id}`);
}

if (collisions.length) {
  console.log("\n— ✗ ID COLLISIONS (these products are NOT written) —");
  for (const c of collisions) {
    console.log(`  ${c.subject}: "${c.titles[0]}" and "${c.titles[1]}" → ${c.id}`);
  }
  console.log("  Give these distinct titles, then re-run.");
}

if (needsReview.length) {
  console.log("\n— ⚠ NEEDS YOUR REVIEW —");
  for (const r of needsReview) {
    console.log(`  ${r.subject}${r.product ? ` / ${r.product}` : ""}`);
    console.log(`      ${r.issue}`);
  }
}

const unconfirmed = products.filter((p) => p._shipUnconfirmed);
if (unconfirmed.length) {
  console.log("\n— ⚠ WEIGHTS MARKED [confirm] IN THE ETSY DRAFTS —");
  console.log("  These decide the framed shipping band, and the band splits at");
  console.log(`  ${FRAMED_BAND_OZ} oz. A guess on the wrong side undercharges $10 per order.`);
  for (const p of unconfirmed) {
    console.log(`  ${p.title} — ${p.shipWeightOz}oz (${p._shipSource})`);
  }
}

if (!APPLY) {
  console.log("\nDry run — nothing written. Re-run with --apply once the review above is clean.\n");
  process.exit(0);
}

if (collisions.length) {
  console.error("\nRefusing to apply with unresolved id collisions.\n");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

let written = 0;
const tx = client.transaction();
for (const p of products) {
  const { _shipSource, _shipUnconfirmed, ...doc } = p;
  void _shipSource;
  void _shipUnconfirmed;
  // createOrReplace keeps re-runs idempotent: deterministic ids mean a second
  // run updates in place rather than duplicating.
  tx.createOrReplace(doc);
  written++;
}
await tx.commit();

console.log(`\n✓ Wrote ${written} product documents.`);
console.log("Legacy fields on artwork are untouched — retire them separately,");
console.log("once the site is verified reading from products.\n");
