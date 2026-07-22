/**
 * Add custom purchase options (prints / postcards / originals) to existing
 * artworks, targeted by slug.
 *
 * Fill in the CONFIG array below, then run from the studio directory:
 *   SANITY_AUTH_TOKEN=<write-token> node migrations/add-purchase-options.mjs
 *
 * Preview without writing anything (no token needed for the fetch):
 *   SANITY_AUTH_TOKEN=<write-token> node migrations/add-purchase-options.mjs --dry-run
 *
 * Notes:
 *   - Idempotent: an option is skipped if the target artwork already has an
 *     option with the same title (case-insensitive). Re-running is safe.
 *   - Options are appended to the existing customOptions array; nothing is
 *     removed or overwritten.
 *   - `kind` must be "print" or "original" (postcards use "print").
 */
import { createRequire } from "module";
import { randomUUID } from "crypto";
const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// CONFIG — one entry per artwork. Match artworks by their slug.
// Each option: { title, kind, price, subtitle?, squareUrl?, venmoNote?, visible? }
//   title    (required) e.g. "8×10 Print"
//   kind     (required) "print" | "original"   (postcards = "print")
//   price    (required) number
//   subtitle (optional) short line under the title
//   squareUrl(optional) Square checkout link
//   venmoNote(optional) note shown for Venmo payment
//   visible  (optional) defaults to true
// ---------------------------------------------------------------------------
const CONFIG = [
  // {
  //   slug: "example-artwork-slug",
  //   options: [
  //     { title: "8×10 Print", kind: "print", price: 40, subtitle: "Archival matte" },
  //     { title: "Postcard",   kind: "print", price: 8 },
  //   ],
  // },
];
// ---------------------------------------------------------------------------

const DRY_RUN = process.argv.includes("--dry-run");

// Load env vars from .env (same pattern as purchase-fields.mjs)
const fs = require("fs");
const path = require("path");
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const { createClient } = require("@sanity/client");

const client = createClient({
  projectId: process.env.SANITY_STUDIO_PROJECT_ID,
  dataset: process.env.SANITY_STUDIO_DATASET || "production",
  token: process.env.SANITY_AUTH_TOKEN,
  apiVersion: "2024-01-01",
  useCdn: false,
});

const VALID_KINDS = new Set(["print", "original"]);

function validateConfig() {
  const errors = [];
  CONFIG.forEach((entry, i) => {
    if (!entry.slug) errors.push(`CONFIG[${i}]: missing slug`);
    if (!Array.isArray(entry.options) || entry.options.length === 0) {
      errors.push(`CONFIG[${i}] (${entry.slug}): needs a non-empty options array`);
      return;
    }
    entry.options.forEach((opt, j) => {
      const at = `CONFIG[${i}].options[${j}] (${entry.slug})`;
      if (!opt.title) errors.push(`${at}: missing title`);
      if (!VALID_KINDS.has(opt.kind)) errors.push(`${at}: kind must be "print" or "original"`);
      if (typeof opt.price !== "number" || !(opt.price > 0)) errors.push(`${at}: price must be a positive number`);
    });
  });
  return errors;
}

function toOptionDoc(opt) {
  const doc = {
    _key: randomUUID().replace(/-/g, "").slice(0, 12),
    _type: "object",
    title: opt.title,
    kind: opt.kind,
    price: opt.price,
    visible: opt.visible ?? true,
  };
  if (opt.subtitle) doc.subtitle = opt.subtitle;
  if (opt.squareUrl) doc.squareUrl = opt.squareUrl;
  if (opt.venmoNote) doc.venmoNote = opt.venmoNote;
  return doc;
}

async function run() {
  if (CONFIG.length === 0) {
    console.error("CONFIG is empty — add at least one artwork entry before running.");
    process.exit(1);
  }

  const errors = validateConfig();
  if (errors.length) {
    console.error("Config validation failed:\n  " + errors.join("\n  "));
    process.exit(1);
  }

  if (!DRY_RUN && !process.env.SANITY_AUTH_TOKEN) {
    console.error("SANITY_AUTH_TOKEN is not set. Provide a write token, or pass --dry-run to preview.");
    process.exit(1);
  }

  console.log(`${DRY_RUN ? "[DRY RUN] " : ""}Processing ${CONFIG.length} artwork(s)...\n`);

  let added = 0;
  let skipped = 0;

  for (const entry of CONFIG) {
    const art = await client.fetch(
      `*[_type == "artwork" && slug.current == $slug][0]{ _id, title, "existing": customOptions[].title }`,
      { slug: entry.slug }
    );

    if (!art) {
      console.warn(`  ⚠ no artwork found for slug "${entry.slug}" — skipping`);
      continue;
    }

    const existingTitles = new Set(
      (art.existing || []).filter(Boolean).map((t) => t.toLowerCase())
    );

    const toAdd = entry.options.filter((opt) => {
      if (existingTitles.has(opt.title.toLowerCase())) {
        console.log(`  = ${art.title}: "${opt.title}" already present — skipping`);
        skipped++;
        return false;
      }
      return true;
    });

    if (toAdd.length === 0) continue;

    const optionDocs = toAdd.map(toOptionDoc);

    for (const opt of toAdd) {
      console.log(`  + ${art.title}: "${opt.title}" (${opt.kind}, $${opt.price})`);
    }
    added += optionDocs.length;

    if (!DRY_RUN) {
      await client
        .patch(art._id)
        .setIfMissing({ customOptions: [] })
        .insert("after", "customOptions[-1]", optionDocs)
        .commit();
    }
  }

  console.log(
    `\n${DRY_RUN ? "[DRY RUN] Would add" : "Added"} ${added} option(s); skipped ${skipped} already-present.`
  );
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
