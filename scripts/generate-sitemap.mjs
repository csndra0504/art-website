/**
 * Post-build step: writes dist/sitemap.xml from the static routes plus every
 * artwork slug in Sanity. Run automatically after `vite-react-ssg build`
 * (see package.json "build"). Safe to run standalone:
 *
 *   node scripts/generate-sitemap.mjs
 *
 * Reads the Sanity project/dataset from the environment, falling back to the
 * VITE_* vars in .env (same values the app build uses).
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@sanity/client";

const SITE_URL = "https://cassandrawilcoxart.com";
const DIST_DIR = path.resolve(process.cwd(), "dist");

// Static, non-dynamic routes. `/subscribe` is intentionally omitted (thin,
// utility page); add it here if that changes.
const STATIC_PATHS = ["/", "/events", "/commissions"];

// Load VITE_* vars from .env if they aren't already in the environment.
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

function xmlEscape(s) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]
  );
}

async function run() {
  loadEnv();

  const projectId = process.env.VITE_SANITY_PROJECT_ID;
  const dataset = process.env.VITE_SANITY_DATASET || "production";

  if (!projectId) {
    console.error(
      "generate-sitemap: VITE_SANITY_PROJECT_ID is not set — cannot enumerate artwork pages."
    );
    process.exit(1);
  }

  if (!fs.existsSync(DIST_DIR)) {
    console.error(`generate-sitemap: ${DIST_DIR} does not exist — run the build first.`);
    process.exit(1);
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-01-01",
    useCdn: false,
  });

  const slugs = await client.fetch(
    `*[_type == "artwork" && defined(slug.current)].slug.current`
  );

  const paths = [
    ...STATIC_PATHS,
    ...slugs.map((slug) => `/artwork/${slug}`),
  ];

  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = paths
    .map(
      (p) =>
        `  <url>\n    <loc>${xmlEscape(SITE_URL + p)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  fs.writeFileSync(path.join(DIST_DIR, "sitemap.xml"), xml, "utf8");
  console.log(
    `generate-sitemap: wrote dist/sitemap.xml with ${paths.length} URLs (${slugs.length} artworks).`
  );
}

run().catch((err) => {
  console.error("generate-sitemap failed:", err);
  process.exit(1);
});
