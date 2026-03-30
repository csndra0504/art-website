/**
 * Migration: Copy legacy purchase fields to new structured fields.
 *   price       → originalPrice
 *   purchaseUrl → printEtsyUrl
 *
 * Then unset the old fields.
 *
 * Run from the studio directory:
 *   node migrations/purchase-fields.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Load env vars from .env
const fs = require("fs");
const path = require("path");
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
    if (match) process.env[match[1]] = match[2];
  }
}

const { createClient } = require("@sanity/client");

const client = createClient({
  projectId: process.env.SANITY_STUDIO_PROJECT_ID,
  dataset: process.env.SANITY_STUDIO_DATASET || "production",
  token: process.env.SANITY_AUTH_TOKEN,
  apiVersion: "2024-01-01",
  useCdn: false,
});

async function migrate() {
  const artworks = await client.fetch(
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
      patch.set({ originalPrice: art.price });
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

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
