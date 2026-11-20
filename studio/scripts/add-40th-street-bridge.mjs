import { createClient } from "@sanity/client";
import { homedir } from "node:os";
import { createReadStream, readFileSync } from "node:fs";

// One-off: creates the 40th Street Bridge subject, its framed original ($250,
// linked to the Square catalog item created 2026-10-23, stock 1). The print
// link (printEtsyUrl) is added once the Etsy print listing is live. Dry run by default; --apply writes.

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
    file: "48-40th-street-bridge-original-01.jpg",
    alt: "Original watercolor painting of the 40th Street Bridge and its reflection in the Allegheny River, framed in black with a midnight blue matte and hung on a wall",
  },
  {
    file: "48-40th-street-bridge-original-02.jpg",
    alt: "The 40th Street Bridge watercolor held in hand before framing, a white arch bridge over the Allegheny River with autumn leaves hanging in the corner",
  },
];

const subjectId = "artwork-40th-street-bridge";
const originalId = "product-40th-street-bridge-original";

const block = (key, text) => ({
  _key: key,
  _type: "block",
  style: "normal",
  markDefs: [],
  children: [{ _key: key + "s", _type: "span", marks: [], text }],
});

const description = [
  block("a1", "I was walking around Lawrenceville one day and found my way underneath the 40th Street Bridge. It was kind of creepy down there, the kind of place where you start to wonder whether there might be dead bodies, and it was also a really beautiful view."),
  block("a2", "I wanted to try a loose, sloppy watercolor of the bridge and its reflection on the Allegheny River. I really love how it turned out."),
  block("a3", "An original watercolor painting of the 40th Street Bridge, framed and ready to hang. One of a kind (not a print)."),
  block("a4", "- 9 x 12 inch original watercolor on paper\n- Black 11 x 14 inch frame with a midnight blue matte\n- Signed by the artist\n- Ships from Pittsburgh"),
  block("a5", "For Lawrenceville locals, bridge lovers, and anyone who likes a little mystery under their favorite Pittsburgh bridge."),
  block("a6", "Commissions are open if you'd like your own Pittsburgh place painted. See the commission listing here: https://www.etsy.com/listing/4471515972/custom-building-ink-sketch-hand-drawn"),
];

const existing = await client.fetch(`*[_id in $ids]{_id}`, {
  ids: [subjectId, originalId],
});
if (existing.length) {
  console.error("Already exist:", existing.map((d) => d._id));
  process.exit(1);
}

console.log(`${apply ? "CREATE" : "would create"} ${subjectId}  "40th Street Bridge"`);
console.log(`${apply ? "CREATE" : "would create"} ${originalId}  Original $250 framedLarge qty 1  Square P5LCLHGQQJBT7GPQYB7IJBLN`);
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
    title: "40th Street Bridge",
    slug: { _type: "slug", current: "40th-street-bridge" },
    images: uploaded,
    description,
    medium: "watercolor",
    dimensions: "9x12",
    year: 2026,
    tags: ["Pittsburgh"],
    forSale: true,
  })
  .create({
    _id: originalId,
    _type: "product",
    subject: { _type: "reference", _ref: subjectId },
    title: "Original (framed)",
    kind: "original",
    price: 250,
    quantity: 1,
    soldOut: false,
    channel: "local",
    visible: true,
    sortOrder: 0,
    shippingType: "framedLarge",
    squareVariationId: "P5LCLHGQQJBT7GPQYB7IJBLN",
    shipWeightOz: 40,
    shipLengthIn: 17,
    shipWidthIn: 14,
    shipHeightIn: 2,
  })
  .commit();
console.log("\nCreated subject + product.");
