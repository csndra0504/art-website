/**
 * Seed the two PNC Park framed originals as UNPUBLISHED DRAFTS.
 *
 * Creates one artwork draft per piece with title, description, medium,
 * dimensions, tags, forSale, and originalPrice already filled in. Two things
 * are intentionally left blank for Cass to finish in Studio before publishing:
 *   1. images        — required; add the framed-original photos, then Publish.
 *   2. originalSquareUrl — paste the Square checkout link so buyers get the
 *                          "Buy with card" button (Venmo works without it).
 *
 * Because each doc id is prefixed "drafts.", these never appear on the live
 * site until you hit Publish in Studio.
 *
 * Run from the studio directory:
 *   node migrations/add-pnc-originals.mjs            # create the drafts
 *   node migrations/add-pnc-originals.mjs --dry-run  # preview, write nothing
 *
 * Auth: uses SANITY_AUTH_TOKEN if set, otherwise falls back to your logged-in
 * Sanity CLI token (~/.config/sanity/config.json).
 */
import { createRequire } from "module";
import { randomUUID } from "crypto";
import os from "os";
import fs from "fs";
import path from "path";
const require = createRequire(import.meta.url);

const DRY_RUN = process.argv.includes("--dry-run");

// --- env (.env in the studio dir, same pattern as the other migrations) ------
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// --- token: env var, or fall back to the logged-in Sanity CLI credential -----
function resolveToken() {
  if (process.env.SANITY_AUTH_TOKEN) return process.env.SANITY_AUTH_TOKEN;
  const cfg = path.join(os.homedir(), ".config", "sanity", "config.json");
  if (fs.existsSync(cfg)) {
    try {
      return JSON.parse(fs.readFileSync(cfg, "utf8")).authToken;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

// --- portable text helpers ---------------------------------------------------
const block = (text) => ({
  _type: "block",
  _key: randomUUID().replace(/-/g, "").slice(0, 12),
  style: "normal",
  markDefs: [],
  children: [
    {
      _type: "span",
      _key: randomUUID().replace(/-/g, "").slice(0, 12),
      text,
      marks: [],
    },
  ],
});

const PGH = // shared middle paragraph, in Cass's voice
  "Pittsburgh has one of the worst MLB teams and one of the best ballparks, especially at golden hour when the skyline glows as yellow as the three sisters bridges. A dollar dog, an IC Light, fireworks at the end. Who won? Hannah Jalapeño.";

const TAGS = [
  "pittsburgh",
  "pnc park",
  "pirates",
  "baseball",
  "original",
  "steel city sports",
];

// --- the two drafts ----------------------------------------------------------
const DOCS = [
  {
    _id: "drafts.pnc-park-ballpoint-mini",
    _type: "artwork",
    title: "PNC Park — Ballpoint Mini",
    slug: { _type: "slug", current: "pnc-park-ballpoint-mini" },
    medium: "Ballpoint pen",
    dimensions: "3.75 × 2.5 in (framed 6.5 × 4.5 in)",
    tags: TAGS,
    forSale: true,
    originalPrice: 100,
    originalSold: false,
    description: [
      block(
        "The view from my first Pirates home game, drawn in colored ballpoint pen and framed. One of a kind — not a print.",
      ),
      block(PGH),
      block("3.75 × 2.5 in, framed in a 6.5 × 4.5 in black frame."),
    ],
  },
  {
    _id: "drafts.pnc-park-watercolor",
    _type: "artwork",
    title: "PNC Park — Watercolor",
    slug: { _type: "slug", current: "pnc-park-watercolor" },
    medium: "Watercolor",
    dimensions: "8 × 6 in (framed 8 × 10 in)",
    tags: TAGS,
    forSale: true,
    originalPrice: 200,
    originalSold: false,
    description: [
      block(
        "The view from my first Pirates home game, painted in watercolor and framed — one of the first watercolors I'm putting up for sale. One of a kind, not a print.",
      ),
      block(PGH),
      block("8 × 6 in, matted and framed in an 8 × 10 in black frame."),
    ],
  },
];

// --- run ---------------------------------------------------------------------
const token = resolveToken();
if (!DRY_RUN && !token) {
  console.error(
    "No Sanity token found. Set SANITY_AUTH_TOKEN or log in with `npx sanity login`.",
  );
  process.exit(1);
}

const { createClient } = require("@sanity/client");
const client = createClient({
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || "p96btff4",
  dataset: process.env.SANITY_STUDIO_DATASET || "production",
  token,
  apiVersion: "2024-01-01",
  useCdn: false,
});

async function run() {
  console.log(`${DRY_RUN ? "[DRY RUN] " : ""}Seeding ${DOCS.length} draft(s)...\n`);
  for (const doc of DOCS) {
    console.log(`  • ${doc.title} — $${doc.originalPrice} (${doc._id})`);
    if (!DRY_RUN) {
      // createIfNotExists: safe to re-run; never clobbers photos you've added.
      await client.createIfNotExists(doc);
    }
  }
  console.log(
    `\n${DRY_RUN ? "[DRY RUN] Would create" : "Created"} ${DOCS.length} unpublished draft(s).`,
  );
  console.log(
    "Next in Studio: open each, add the framed-original photo(s), paste the Square link into “Original — Square Checkout Link”, then Publish.",
  );
}

run().catch((err) => {
  console.error("Failed:", err.message || err);
  process.exit(1);
});
