import { createClient } from "@sanity/client";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Phase 1: add a "5×7 Print — Local Pickup" custom purchase option (Square link,
// local pickup only) to the Titty Sphinx (Allegheny Cemetery) artwork.
// Authenticates as the logged-in Sanity CLI user via the stored token.
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
const SQUARE_URL = "https://square.link/u/GU8Strgj";

const OPTION = {
  _type: "object",
  title: "5×7 Print — Local Pickup",
  kind: "print",
  price: 10,
  subtitle: "Local pickup only (Pittsburgh)",
  squareUrl: SQUARE_URL,
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
    (o) => o.squareUrl === SQUARE_URL || o.title === OPTION.title
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
