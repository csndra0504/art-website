import { createClient } from "@sanity/client";
import { homedir } from "node:os";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// CAS-37. Writes each product's Square variation id into Sanity, from the
// reviewed mapping in docs/cart-checkout/square-mapping.json. Checkout can only
// sell a product that has one: Square decrements stock solely for line items
// referencing a catalog object.
//
// Dry run by default; --apply writes. Re-runnable: a product already pointing at
// the right variation is left alone, and a product pointing at a *different* one
// is reported and skipped unless --force, because that's either a mapping
// mistake or a hand edit worth looking at.
//
//   node studio/scripts/link-square-catalog.mjs
//   node studio/scripts/link-square-catalog.mjs --apply

const apply = process.argv.includes("--apply");
const force = process.argv.includes("--force");

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

const here = dirname(fileURLToPath(import.meta.url));
const { matches } = JSON.parse(
  readFileSync(join(here, "../../docs/cart-checkout/square-mapping.json"), "utf8")
);

const ids = matches.flatMap((m) => [m.productId, `drafts.${m.productId}`]);
const docs = await client.fetch(
  `*[_id in $ids]{_id, title, squareVariationId, "subject": subject->title}`,
  { ids }
);
const byId = new Map(docs.map((d) => [d._id, d]));

const plan = [];
const skipped = [];
for (const m of matches) {
  // Both the published document and any open draft: publishing a draft later
  // would otherwise wipe the id and quietly take the product out of the cart.
  for (const id of [m.productId, `drafts.${m.productId}`]) {
    const doc = byId.get(id);
    if (!doc) {
      if (!id.startsWith("drafts.")) skipped.push({ id, why: "not in Sanity" });
      continue;
    }
    if (doc.squareVariationId === m.variationId) continue;
    if (doc.squareVariationId && !force) {
      skipped.push({
        id,
        why: `already points at ${doc.squareVariationId}, mapping says ${m.variationId} — use --force`,
      });
      continue;
    }
    plan.push({ id, variationId: m.variationId, label: `${doc.subject ?? "?"} — ${doc.title}`, square: m.square });
  }
}

for (const p of plan) {
  console.log(`${p.id.startsWith("drafts.") ? "draft  " : "publish"}  ${p.label.padEnd(52)} → ${p.square}`);
}
for (const s of skipped) console.log(`SKIP     ${s.id}: ${s.why}`);
console.log(`\n${plan.length} to write, ${skipped.length} skipped, ${matches.length} products in the mapping`);

if (!apply) {
  console.log("\nDry run. Re-run with --apply to write.");
  process.exit(0);
}

let tx = client.transaction();
for (const p of plan) tx = tx.patch(p.id, (patch) => patch.set({ squareVariationId: p.variationId }));
await tx.commit();
console.log(`\nWrote ${plan.length} ids.`);
