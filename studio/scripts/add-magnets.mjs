import { createClient } from "@sanity/client";
import { homedir } from "node:os";
import { readFileSync } from "node:fs";

// One-off: creates a Sanity "magnet" product for each "Magnet, …" item in the
// Square catalog (added 2026-10-08), linked to its existing subject. Stock is
// left to Square — quantity is 0 and the webhook owns soldOut — except where
// Square already reads 0 at creation, which we mirror so it isn't offered.
// Dry run by default; --apply writes.

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

// There are two PNC Park subjects; the magnet is the Ballpoint Mini one.
const magnets = [
  { subjectId: "pnc-park-ballpoint-mini", squareVariationId: "BDDFFKUQMSZNCTU3CMKOD6ZH" },
  { subjectId: "8ed6f5c5-d267-4ef6-acde-9f3bf7d5989d", squareVariationId: "NSOFE3C24U2KIPDLFHEUIJEF" }, // 16th Street Bridge
  { subjectId: "dd5eec2c-f075-4d1f-ba65-6249ea0b9c34", squareVariationId: "LA27FFWWBULRCUCTUSQHFVFH" }, // Dippy the Dino
  { subjectId: "8d71ca6d-4c81-4a6b-8c7e-1b83113e2b87", squareVariationId: "PKTWAAEQT2JCCNGAJJVZQRM7" }, // Heinz Ketchup
  { subjectId: "c3df2261-1a60-4735-bec7-a31ee5750b0b", squareVariationId: "UF2CT7CVXVTYF52RW3KVYRKV" }, // Iron City Clock
  { subjectId: "6adc0de9-410b-4131-934b-772c91efaf53", squareVariationId: "DZVVSI3TP44S4LFB3FFO4S5V" }, // Kennywood Dog & OG Beer
  { subjectId: "artwork-maxs-allegheny-tavern", squareVariationId: "4XEEBECUKENXOD5QZMJBR6PW" },
  { subjectId: "f1fef67b-2ec9-4a5a-96a3-56241d0ba44e", squareVariationId: "3FXZOGECJXVFVUB5UOXCWILU" }, // Mr. Smalls
  { subjectId: "097d33ac-111c-482a-87ce-9b73050b426a", squareVariationId: "OBN5FTDX3FTDXNUWJSA2UVPX" }, // North Shore Skyline
  { subjectId: "31134c9b-09c8-42f3-a3ed-012c3f8ccdb9", squareVariationId: "2P3RKBIDUJWEIWNFVDGWNQWQ" }, // Park Place Pub
  { subjectId: "79ba1164-8d6b-4ff5-bd08-21d620cfbcab", squareVariationId: "QBNPLZELOKKPYWAUGU3AVQ6U" }, // Rialto
  { subjectId: "1b5fb858-5c1a-4ada-857e-e72e80b1c417", squareVariationId: "QRGN7N6MFYLJPDC54AOPKNHC" }, // Rock Room
  { subjectId: "ff3bd6ef-58f1-451c-8e7c-fb38b0734e05", squareVariationId: "JW7A6FB5AZB65BETLJ5ASGX6", soldOut: true }, // Tazza D'oro
  { subjectId: "artwork-thunderbird-cafe-music-hall", squareVariationId: "4JBCPNXCOMIKC75Z53UKWXTB" },
  { subjectId: "artwork-allegheny-cemetery-sphinx", squareVariationId: "JTBEVHONDLMXKD67KNDYZ47A" },
];

const slug = (s) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const subjects = await client.fetch(`*[_type=="artwork" && _id in $ids]{_id,title}`, {
  ids: magnets.map((m) => m.subjectId),
});
const titleOf = new Map(subjects.map((s) => [s._id, s.title]));
const missing = magnets.filter((m) => !titleOf.has(m.subjectId));
if (missing.length) {
  console.error("Subjects not found:", missing.map((m) => m.subjectId));
  process.exit(1);
}

const docs = magnets.map((m) => ({
  ...m,
  _id: `product-${slug(titleOf.get(m.subjectId))}-magnet`,
}));

const existing = await client.fetch(`*[_id in $ids]{_id}`, { ids: docs.map((d) => d._id) });
if (existing.length) {
  console.log("Already exist, skipping these ids:", existing.map((d) => d._id));
}
const existingIds = new Set(existing.map((d) => d._id));
const toCreate = docs.filter((d) => !existingIds.has(d._id));

for (const d of toCreate) {
  console.log(`${apply ? "CREATE" : "would create"}  ${d._id}${d.soldOut ? "  [sold out]" : ""}`);
  console.log(`  subject="${titleOf.get(d.subjectId)}" square=${d.squareVariationId}`);
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
    title: "2x3 Magnet",
    kind: "magnet",
    price: 8,
    quantity: 0,
    soldOut: !!d.soldOut,
    channel: "local",
    visible: true,
    sortOrder: 40,
    shippingType: "magnet",
    squareVariationId: d.squareVariationId,
  });
}
await tx.commit();
console.log(`\nCreated ${toCreate.length} products.`);
