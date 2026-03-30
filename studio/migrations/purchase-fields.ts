/**
 * Migration: Copy legacy purchase fields to new structured fields.
 *   price       → printEtsyPrice  (existing prices were Etsy print prices)
 *   purchaseUrl → printEtsyUrl
 *
 * Then unset the old fields.
 *
 * Run from the studio directory:
 *   npx sanity exec migrations/purchase-fields.ts --with-user-token
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { getCliClient } = require("sanity/cli");

const client = getCliClient().withConfig({ apiVersion: "2024-01-01" });

async function migrate() {
  const artworks: { _id: string; price?: number; purchaseUrl?: string }[] =
    await client.fetch(
      `*[_type == "artwork" && (defined(price) || defined(purchaseUrl))]{ _id, price, purchaseUrl }`
    );

  if (artworks.length === 0) {
    console.log("No artworks need migration.");
    return;
  }

  console.log(`Migrating ${artworks.length} artwork(s)...`);

  for (const art of artworks) {
    const patch = client.patch(art._id);

    if (art.price != null) {
      patch.set({ printEtsyPrice: art.price });
    }
    if (art.purchaseUrl) {
      patch.set({ printEtsyUrl: art.purchaseUrl });
    }

    // Remove old fields
    patch.unset(["price", "purchaseUrl"]);

    const result = await patch.commit();
    console.log(`  done ${result._id}`);
  }

  console.log("Migration complete.");
}

migrate().catch((err: unknown) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
