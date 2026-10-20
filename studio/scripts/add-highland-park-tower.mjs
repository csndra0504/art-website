import { createClient } from "@sanity/client";
import { homedir } from "node:os";
import { createReadStream, readFileSync } from "node:fs";

// One-off: creates the Highland Park Tower subject, its framed original ($150,
// linked to the Square catalog item created 2026-10-20, stock 1). The print is
// only a printEtsyUrl on the subject. Dry run by default; --apply writes.

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
    file: "46-highland-park-tower-original-01.jpg",
    alt: "Original watercolor painting of the Highland House glass tower in Pittsburgh's Highland Park, framed in black with a matte and hung on a wall",
  },
  {
    file: "46-highland-park-tower-original-02.jpg",
    alt: "The Highland Park tower watercolor held in hand, a glass tower under a moody gray sky with dark evergreen trees in the foreground",
  },
];

const subjectId = "artwork-highland-park-tower";
const originalId = "product-highland-park-tower-original";
const ETSY_PRINT_URL =
  "https://www.etsy.com/listing/4599461469/pittsburgh-highland-park-tower-art-print";

const block = (key, text) => ({
  _key: key,
  _type: "block",
  style: "normal",
  markDefs: [],
  children: [{ _key: key + "s", _type: "span", marks: [], text }],
});

const description = [
  block("a1", "Highland House, the 22 story glass tower in Highland Park, in Pittsburgh's East End. It opened in 1962. It looks out of place among the neighborhood's historic houses, and it is also one of the most recognizable things in Highland Park. After living here for over a year, I follow it home like a beacon."),
  block("a2", "On the right days, depending on the sky and the weather, it is kind of pretty. This is a painting of one of those days: a moody sky, dark trees in the foreground, and the straight lines of the building coming up out of the park. The reflective glass nearly blends into the clouds behind it."),
  block("a3", "An original watercolor painting of Highland House, framed and ready to hang. One of a kind (not a print)."),
  block("a4", "- 9 x 12 inch original watercolor, framed in black with a matte\n- Signed by the artist\n- Ships from Pittsburgh"),
  block("a5", "For Highland Park residents, East End regulars, and anyone who has a soft spot for a building that is a little silly."),
  block("a6", "Commissions are open if you'd like your own Pittsburgh place painted. See the commission listing here: https://www.etsy.com/listing/4471515972/custom-building-ink-sketch-hand-drawn"),
];

const existing = await client.fetch(`*[_id in $ids]{_id}`, {
  ids: [subjectId, originalId],
});
if (existing.length) {
  console.error("Already exist:", existing.map((d) => d._id));
  process.exit(1);
}

console.log(`${apply ? "CREATE" : "would create"} ${subjectId}  "Highland Park Tower"`);
console.log(`${apply ? "CREATE" : "would create"} ${originalId}  Original $150 framedLarge qty 1  Square 3WGQBM7IBIERJ5RTRRQ23MXB`);
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
    title: "Highland Park Tower",
    slug: { _type: "slug", current: "highland-park-tower" },
    images: uploaded,
    description,
    medium: "watercolor",
    dimensions: "9x12",
    year: 2026,
    tags: ["Pittsburgh"],
    forSale: true,
    printEtsyUrl: ETSY_PRINT_URL,
  })
  .create({
    _id: originalId,
    _type: "product",
    subject: { _type: "reference", _ref: subjectId },
    title: "Original (framed)",
    kind: "original",
    price: 150,
    quantity: 1,
    soldOut: false,
    channel: "local",
    visible: true,
    sortOrder: 0,
    shippingType: "framedLarge",
    squareVariationId: "3WGQBM7IBIERJ5RTRRQ23MXB",
    shipWeightOz: 32,
    shipLengthIn: 15,
    shipWidthIn: 12,
    shipHeightIn: 2,
  })
  .commit();
console.log("\nCreated subject + product.");
