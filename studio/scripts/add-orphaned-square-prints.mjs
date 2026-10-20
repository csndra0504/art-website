import { createClient } from "@sanity/client";
import { homedir } from "node:os";
import { readFileSync } from "node:fs";

// One-off: creates Sanity products for 6 Square catalog items that were in
// stock and sellable but had no matching website product (found during a
// 2026-09-22 reconciliation). Dry run by default; --apply writes.

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

const FRAMED_SUBTITLE =
  "Hanging at De Fer Coffee, Downtown. If you're there, feel free to take it off the wall — otherwise I'll ship it to you.";

const docs = [
  {
    _id: "product-biddles-escape-pittsburgh-pa-5x7-print",
    subjectId: "002510db-6717-42e6-8c9c-f76581054ff6",
    title: "5x7 Print",
    price: 10,
    shippingType: "postcard",
    sortOrder: 31,
    squareVariationId: "2A63B744BXDYGCGNIDBL27ID",
  },
  {
    _id: "product-bryant-street-market-pittsburgh-pa-5x7-print",
    subjectId: "47537f75-9d86-4166-876b-a5c1b1db0513",
    title: "5x7 Print",
    price: 10,
    shippingType: "postcard",
    sortOrder: 31,
    squareVariationId: "PDQPEWWM2NEPZ3BT5M2LK4RE",
  },
  {
    _id: "product-heinz-ketchup-bottle-5x7-print",
    subjectId: "8d71ca6d-4c81-4a6b-8c7e-1b83113e2b87",
    title: "5x7 Print",
    price: 10,
    shippingType: "postcard",
    sortOrder: 31,
    squareVariationId: "QZQSO574NOK3ZPJGENM7FIGT",
  },
  {
    _id: "product-mr-smalls-theater-millvale-pittsburgh-pa-5x7-print",
    subjectId: "f1fef67b-2ec9-4a5a-96a3-56241d0ba44e",
    title: "5x7 Print",
    price: 10,
    shippingType: "postcard",
    sortOrder: 31,
    squareVariationId: "ECV2TZBFUQTWGU7ASYJCQKI6",
  },
  {
    _id: "product-kaibur-coffee-polish-hill-pittsburgh-pa-5x7-print",
    subjectId: "f8e0a916-e1ed-43d6-8d53-8b632ff641e1",
    title: "5x7 Print",
    price: 10,
    shippingType: "postcard",
    sortOrder: 31,
    squareVariationId: "COARFM74SNV56JK7UG35BXIX",
  },
  {
    _id: "product-kaibur-coffee-polish-hill-pittsburgh-pa-framed-5x7-print",
    subjectId: "f8e0a916-e1ed-43d6-8d53-8b632ff641e1",
    title: "Framed 5x7 Print",
    price: 40,
    shippingType: "framedSmall",
    sortOrder: 30,
    subtitle: FRAMED_SUBTITLE,
    squareVariationId: "XH3JOEHKPC27NCGAMC7VYM3C",
  },
];

const existing = await client.fetch(`*[_id in $ids]{_id}`, {
  ids: docs.map((d) => d._id),
});
if (existing.length) {
  console.log("Already exist, skipping these ids:", existing.map((d) => d._id));
}
const existingIds = new Set(existing.map((d) => d._id));
const toCreate = docs.filter((d) => !existingIds.has(d._id));

for (const d of toCreate) {
  console.log(`${apply ? "CREATE" : "would create"}  ${d._id}`);
  console.log(
    `  subject=${d.subjectId} title="${d.title}" price=$${d.price} shippingType=${d.shippingType} square=${d.squareVariationId}`
  );
}
console.log(`\n${toCreate.length} to create, ${existingIds.size} already present.`);

if (!apply) {
  console.log("\nDry run. Re-run with --apply to write.");
  process.exit(0);
}

let tx = client.transaction();
for (const d of toCreate) {
  tx = tx.create({
    _id: d._id,
    _type: "product",
    subject: { _type: "reference", _ref: d.subjectId },
    title: d.title,
    kind: "print",
    price: d.price,
    quantity: 0,
    soldOut: false,
    channel: "local",
    visible: true,
    sortOrder: d.sortOrder,
    shippingType: d.shippingType,
    ...(d.subtitle ? { subtitle: d.subtitle } : {}),
    squareVariationId: d.squareVariationId,
  });
}
await tx.commit();
console.log(`\nCreated ${toCreate.length} products.`);
