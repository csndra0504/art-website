import { createClient } from "@sanity/client";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { readFileSync, createReadStream } from "node:fs";
import { join } from "node:path";

// Replace the Titty Sphinx leading image with the 5×7 print scan.
// Result: [5×7 print, existing additional-view image]. The old ink-drawing
// lead is dropped from the listing (the asset itself stays in Sanity).
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

const BASE_ID = "artwork-allegheny-cemetery-sphinx";
const PRINT_PATH =
  "/Users/cassandrawilcox/Development/ARTSHOP IMAGES/Titty Sphinx/titty_sphynx_5x7_PRINT.jpg";
const NEW_ALT =
  "5×7 art print of the Allegheny Cemetery sphinx statue, Pittsburgh";

// 1. Upload the print as an image asset.
console.log("Uploading print image…");
const asset = await client.assets.upload("image", createReadStream(PRINT_PATH), {
  filename: "titty_sphynx_5x7_PRINT.jpg",
});
console.log(`✓ uploaded asset ${asset._id} (${asset.metadata?.dimensions?.width}×${asset.metadata?.dimensions?.height})`);

const printImage = {
  _type: "image",
  _key: randomUUID().replace(/-/g, "").slice(0, 12),
  alt: NEW_ALT,
  asset: { _type: "reference", _ref: asset._id },
};

// 2. On each existing doc (published + draft), rebuild images: print first,
//    then everything except the current leading image.
const ids = [BASE_ID, `drafts.${BASE_ID}`];
const docs = await client.fetch(`*[_id in $ids]{_id, images}`, { ids });

if (docs.length === 0) throw new Error(`No document found for ${BASE_ID}`);

for (const doc of docs) {
  const current = doc.images ?? [];
  const kept = current.slice(1); // drop old leading image, keep the rest
  const next = [printImage, ...kept];
  await client.patch(doc._id).set({ images: next }).commit();
  console.log(
    `✓ ${doc._id}: images now [${next.map((i) => i.alt).join(" | ")}]`
  );
}

console.log("Done.");
