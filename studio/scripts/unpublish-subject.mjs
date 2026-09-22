import { createClient } from "@sanity/client";
import { homedir } from "node:os";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Unpublish a subject and its products, the way the Studio's Unpublish does:
// the published documents go away (so the page 404s and drops out of the
// gallery), a draft of each is kept, so nothing is lost and one click in the
// Studio brings it back.
//
// A published subject can't be deleted while anything references it, so the
// products go first, and their draft copies hold a *weak* reference — a strong
// one would block the subject's deletion just as well.
//
//   node studio/scripts/unpublish-subject.mjs <slug>
//   node studio/scripts/unpublish-subject.mjs <slug> --apply

const slug = process.argv[2];
const apply = process.argv.includes("--apply");
if (!slug || slug.startsWith("--")) {
  console.error("usage: node studio/scripts/unpublish-subject.mjs <slug> [--apply]");
  process.exit(1);
}

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

const subject = await client.fetch(`*[_type == "artwork" && slug.current == $slug][0]`, { slug });
if (!subject) {
  console.error(`No published subject with slug "${slug}".`);
  process.exit(1);
}
const products = await client.fetch(
  `*[_type == "product" && subject._ref == $id]`,
  { id: subject._id }
);
const others = await client.fetch(
  `*[references($id) && _type != "product"]{_id, _type}`,
  { id: subject._id }
);

console.log(`subject:  ${subject._id}  ${subject.title}`);
for (const p of products) console.log(`product:  ${p._id}  ${p.title}  visible=${p.visible}`);
if (others.length) {
  console.error("\nOther documents reference this subject; unpublishing would break them:");
  for (const o of others) console.error(`  ${o._type} ${o._id}`);
  process.exit(1);
}

if (!apply) {
  console.log("\nDry run. --apply to unpublish (drafts kept for every document).");
  process.exit(0);
}

const draftOf = (doc, patch = {}) => ({ ...doc, ...patch, _id: `drafts.${doc._id}` });

let tx = client.transaction();
for (const p of products) {
  // Weak reference: keeps the draft valid without pinning the published subject.
  tx = tx.createIfNotExists(
    draftOf(p, { subject: { ...p.subject, _weak: true } })
  );
}
tx = tx.createIfNotExists(draftOf(subject));
for (const p of products) tx = tx.delete(p._id);
tx = tx.delete(subject._id);
await tx.commit();

console.log(`\nUnpublished ${products.length} product(s) and the subject. Drafts kept in the Studio.`);
