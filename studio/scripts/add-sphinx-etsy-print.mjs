import { createClient } from "@sanity/client";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Phase 1.5: add a "5×7 Print — Ships via Etsy" custom purchase option ($15,
// Etsy outbound link) to the Titty Sphinx (Allegheny Cemetery) artwork.
// RUN ONLY AFTER the etsyUrl-rendering code is deployed — otherwise the live
// (old) code renders this option as a $15 Venmo button.
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
const ETSY_URL =
  "https://www.etsy.com/listing/4549282721/allegheny-cemetery-sphinx-statue-art";

const OPTION = {
  _type: "object",
  title: "5×7 Print — Ships via Etsy",
  kind: "print",
  price: 15,
  subtitle: "Ships via Etsy",
  etsyUrl: ETSY_URL,
  visible: true,
};

const ids = [BASE_ID, `drafts.${BASE_ID}`];
const docs = await client.fetch(`*[_id in $ids]{_id, title, customOptions}`, {
  ids,
});

if (docs.length === 0) {
  throw new Error(`No document found for ${BASE_ID}`);
}

for (const doc of docs) {
  const existing = doc.customOptions ?? [];
  const already = existing.find(
    (o) => o.etsyUrl === ETSY_URL || o.title === OPTION.title
  );
  if (already) {
    console.log(
      `• ${doc._id}: option already present (key ${already._key}) — skipping`
    );
    continue;
  }
  const option = { ...OPTION, _key: randomUUID().replace(/-/g, "").slice(0, 12) };
  await client
    .patch(doc._id)
    .setIfMissing({ customOptions: [] })
    .append("customOptions", [option])
    .commit();
  console.log(
    `✓ ${doc._id}: added "${option.title}" ($${option.price}, key ${option._key})`
  );
}

console.log("Done.");
