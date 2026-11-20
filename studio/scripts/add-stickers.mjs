import { createClient } from "@sanity/client";
import { homedir } from "node:os";
import { createReadStream, readFileSync } from "node:fs";

// One-off: adds the three 3-inch stickers ($3, or any 2 for $5 — the deal lives
// in src/lib/discounts.ts). Heinz Ketchup and Bananas already have subjects, so
// they get a sticker product plus the sticker photos appended to their images.
// Spotted Lanternfly has no subject yet, so it gets one.
//
// Each sticker needs a Square catalog item first (stock + price live there).
// Fill in the variation ids below, then run. Dry run by default; --apply writes.

const apply = process.argv.includes("--apply");

const SQUARE = {
  heinz: process.env.SQUARE_HEINZ ?? "",
  bananas: process.env.SQUARE_BANANAS ?? "",
  lanternfly: process.env.SQUARE_LANTERNFLY ?? "",
};

const { authToken } = JSON.parse(
  readFileSync(homedir() + "/.config/sanity/config.json", "utf8")
);
const client = createClient({
  projectId: "p96btff4",
  dataset: "production",
  apiVersion: "2023-05-01",
  token: authToken,
  useCdn: false,
});

const SRC = homedir() + "/Development/ARTSHOP IMAGES/STICKERS/";

const stickers = [
  {
    key: "heinz",
    subjectId: "8d71ca6d-4c81-4a6b-8c7e-1b83113e2b87",
    productId: "product-heinz-ketchup-bottle-sticker",
    images: [
      { file: "ketchup/IMG_0522.jpeg", alt: "Die-cut Heinz ketchup bottle sticker lying flat on kraft paper" },
      { file: "ketchup/IMG_0521.jpeg", alt: "Three Heinz ketchup bottle stickers fanned out in a hand" },
    ],
  },
  {
    key: "bananas",
    subjectId: "ddf1250b-802d-4932-90b5-cd738d0fc8c7",
    productId: "product-bananas-sticker",
    images: [
      { file: "bananas/IMG_0520.jpeg", alt: "Die-cut bananas sticker lying flat on kraft paper" },
      { file: "bananas/IMG_0519.jpeg", alt: "Several bananas stickers fanned out in a hand" },
    ],
  },
  {
    key: "lanternfly",
    subjectId: "artwork-spotted-lanternfly",
    productId: "product-spotted-lanternfly-sticker",
    newSubject: {
      title: "Spotted Lanternfly",
      slug: "spotted-lanternfly",
      medium: "Ink & Alcohol Marker",
      description:
        "I drew this one to honor the poor little Lanternflys that get stomped every summer because they are invasive and destructive to certain trees. I have a hard time stomping them. They didn't choose to be invasive. Humans are invasive too...",
    },
    images: [
      { file: "lantern fly/IMG_0524.jpeg", alt: "Die-cut spotted lanternfly sticker lying flat on kraft paper" },
      { file: "lantern fly/IMG_0523.jpeg", alt: "Two spotted lanternfly stickers in a hand" },
    ],
  },
];

const block = (key, text) => ({
  _key: key,
  _type: "block",
  style: "normal",
  markDefs: [],
  children: [{ _key: key + "s", _type: "span", marks: [], text }],
});

const ids = stickers.flatMap((s) => [s.subjectId, s.productId]);
const existing = new Set(
  (await client.fetch(`*[_id in $ids]{_id}`, { ids })).map((d) => d._id)
);

for (const s of stickers) {
  if (existing.has(s.productId)) {
    console.error("Product already exists:", s.productId);
    process.exit(1);
  }
  if (!s.newSubject && !existing.has(s.subjectId)) {
    console.error("Subject not found:", s.subjectId);
    process.exit(1);
  }
  console.log(
    `${apply ? "CREATE" : "would create"}  ${s.productId}  3 inch Sticker $3  square=${SQUARE[s.key] || "(none yet)"}`
  );
  console.log(
    s.newSubject
      ? `  + new subject "${s.newSubject.title}", ${s.images.length} images`
      : `  + ${s.images.length} images appended to existing subject`
  );
}

if (!apply) {
  console.log("\nDry run. Re-run with --apply to write.");
  process.exit(0);
}

const missing = stickers.filter((s) => !SQUARE[s.key]);
if (missing.length) {
  console.error(
    "\nMissing Square variation ids:",
    missing.map((s) => `SQUARE_${s.key.toUpperCase()}`).join(", ")
  );
  process.exit(1);
}

let tx = client.transaction();
for (const s of stickers) {
  const uploaded = [];
  for (const [n, i] of s.images.entries()) {
    const asset = await client.assets.upload("image", createReadStream(SRC + i.file), {
      filename: i.file.split("/").pop(),
    });
    uploaded.push({
      _key: `sticker${n}`,
      _type: "image",
      alt: i.alt,
      asset: { _type: "reference", _ref: asset._id },
    });
  }

  if (s.newSubject) {
    tx = tx.create({
      _id: s.subjectId,
      _type: "artwork",
      title: s.newSubject.title,
      slug: { _type: "slug", current: s.newSubject.slug },
      images: uploaded,
      description: [block("d1", s.newSubject.description)],
      medium: s.newSubject.medium,
      year: 2026,
      tags: ["Pittsburgh"],
      forSale: true,
    });
  } else {
    // After the existing art, so the print stays the lead image.
    tx = tx.patch(s.subjectId, (p) => p.setIfMissing({ images: [] }).append("images", uploaded));
  }

  tx = tx.create({
    _id: s.productId,
    _type: "product",
    subject: { _type: "reference", _ref: s.subjectId },
    title: "3 inch Sticker",
    kind: "sticker",
    price: 3,
    quantity: 0,
    soldOut: false,
    channel: "local",
    visible: true,
    sortOrder: 45,
    shippingType: "magnet",
    squareVariationId: SQUARE[s.key],
  });
}
await tx.commit();
console.log("\nCreated 3 sticker products.");
