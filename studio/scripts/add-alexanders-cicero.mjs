import { createClient } from "@sanity/client";
import { homedir } from "node:os";
import { createReadStream, readFileSync } from "node:fs";

// One-off: creates the Alexander's Ice Cream (Cicero, IN) subject and its framed
// original ($75) from the Etsy draft's images, linked to the Square catalog
// item created 2026-10-12 (stock 1 at the one location). Dry run by default;
// --apply writes.

const apply = process.argv.includes("--apply");

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

const ASSETS = homedir() + "/Development/artbizhq/projects/etsy/sync/assets/";
const images = [
  {
    file: "45-alexanders-ice-cream-cicero-01.jpg",
    alt: "Framed original watercolor of Alexander's Ice Cream, a small ice cream shop in Cicero, Indiana, hanging on a wall",
  },
  {
    file: "45-alexanders-ice-cream-cicero-02.jpg",
    alt: "Original watercolor of Alexander's Ice Cream in Cicero, Indiana, with red umbrellas and shade trees",
  },
  {
    file: "45-alexanders-ice-cream-cicero-03.jpg",
    alt: "The Alexander's Ice Cream watercolor held in hand before framing, showing the deckled paper edge",
  },
  {
    file: "45-alexanders-ice-cream-cicero-04.jpg",
    alt: "The artist holding the framed Alexander's Ice Cream watercolor",
  },
];

const subjectId = "artwork-alexanders-ice-cream-cicero";
const productId = "product-alexanders-ice-cream-cicero-original";

const block = (key, text) => ({
  _key: key,
  _type: "block",
  style: "normal",
  markDefs: [],
  children: [{ _key: key + "s", _type: "span", marks: [], text }],
});

const description = [
  block("a1", "Alexander's Ice Cream in Cicero, Indiana, right next to Morse Reservoir in Hamilton County, a county north of Indianapolis."),
  block("a2", "I lived in Cicero while I went to Hamilton Heights High School. In the summer my friends and I would ride our bikes around town and end up at Alexander's. I painted this on location while I was back for my high school reunion, which was a great time, right before grabbing a bite at Boathouse across the street."),
  block("a3", "An original watercolor of Alexander's, framed and ready to hang. One of a kind (not a print)."),
  block("a4", "- 5 x 7 inch painting, framed in a black 5x7 frame\n- Original watercolor painting (the only one)\n- Ships from Pittsburgh"),
  block("a5", "A small piece with lake life vibes for a house on the lake, anyone who lives in Cicero or used to, and anyone who loves Alexander's ice cream."),
  block("a6", "Commissions are open if you'd like your own place painted. See the commission listing here: https://www.etsy.com/listing/4471515972/custom-building-ink-sketch-hand-drawn"),
];

const existing = await client.fetch(`*[_id in $ids]{_id}`, { ids: [subjectId, productId] });
if (existing.length) {
  console.error("Already exist:", existing.map((d) => d._id));
  process.exit(1);
}

console.log(`${apply ? "CREATE" : "would create"} ${subjectId}  "Alexander's Ice Cream (Cicero, IN)"`);
console.log(`${apply ? "CREATE" : "would create"} ${productId}  Original $75 framedSmall qty 1`);
images.forEach((i) => console.log(`  image ${i.file}`));

if (!apply) {
  console.log("\nDry run. Re-run with --apply to write.");
  process.exit(0);
}

const uploaded = [];
for (const [n, i] of images.entries()) {
  const asset = await client.assets.upload("image", createReadStream(ASSETS + i.file), {
    filename: i.file,
  });
  uploaded.push({
    _key: `img${n}`,
    _type: "image",
    alt: i.alt,
    asset: { _type: "reference", _ref: asset._id },
  });
}

await client
  .transaction()
  .create({
    _id: subjectId,
    _type: "artwork",
    title: "Alexander's Ice Cream (Cicero, IN)",
    slug: { _type: "slug", current: "alexanders-ice-cream-cicero-in" },
    images: uploaded,
    description,
    medium: "watercolor",
    dimensions: "5x7",
    year: 2026,
    tags: ["Cicero"],
    forSale: true,
  })
  .create({
    _id: productId,
    _type: "product",
    subject: { _type: "reference", _ref: subjectId },
    title: "Original",
    kind: "original",
    price: 75,
    quantity: 1,
    soldOut: false,
    channel: "local",
    visible: true,
    sortOrder: 0,
    shippingType: "framedSmall",
    squareVariationId: "JHTNWWJX62HFIL54P3SBXDAN",
    shipWeightOz: 12,
    shipLengthIn: 9,
    shipWidthIn: 7,
    shipHeightIn: 1.5,
  })
  .commit();
console.log("\nCreated subject + product.");
