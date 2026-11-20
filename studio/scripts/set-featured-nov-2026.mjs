import { createClient } from "@sanity/client";
import { homedir } from "node:os";
import { readFileSync } from "node:fs";

// One-off: sets the featured artworks (and their order) for the Nov 2026 holiday
// push, and unfeatures the previous two. Featured items sort first, then by
// sortOrder. Dry run by default; --apply writes.

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

const FEATURE = [
  "c3df2261-1a60-4735-bec7-a31ee5750b0b", // Iron City Clock
  "8d71ca6d-4c81-4a6b-8c7e-1b83113e2b87", // Heinz Ketchup Bottle
  "artwork-allegheny-cemetery-sphinx", // Titty Sphinx
  "pnc-park-watercolor", // PNC Park (Watercolor)
  "dd5eec2c-f075-4d1f-ba65-6249ea0b9c34", // Dippy the Dino
  "artwork-cathedral-of-learning", // Cathedral of Learning
];
const UNFEATURE = [
  "31134c9b-09c8-42f3-a3ed-012c3f8ccdb9", // Park Place Pub
  "ff3bd6ef-58f1-451c-8e7c-fb38b0734e05", // Tazza D'oro
];

const ids = [...FEATURE, ...UNFEATURE];
const found = await client.fetch(`*[_id in $ids]{_id, title}`, { ids });
if (found.length !== ids.length) {
  console.error("Missing docs:", ids.filter((id) => !found.some((d) => d._id === id)));
  process.exit(1);
}

const tx = client.transaction();
FEATURE.forEach((id, i) => tx.patch(id, (p) => p.set({ featured: true, sortOrder: i + 1 })));
UNFEATURE.forEach((id) => tx.patch(id, (p) => p.set({ featured: false })));

for (const d of found) console.log(FEATURE.includes(d._id) ? "feature  " : "unfeature", d.title);
if (!apply) {
  console.log("\nDry run. Re-run with --apply to write.");
  process.exit(0);
}
await tx.commit();
console.log("\nDone.");
