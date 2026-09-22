import { createClient } from "@sanity/client";
import { homedir } from "node:os";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Normalise the legacy customOptions titles before migrating to products.
//
//   node studio/scripts/normalize-option-titles.mjs          # dry run
//   node studio/scripts/normalize-option-titles.mjs --apply
//
// This has to run against the LEGACY fields, not the products, because the
// migration derives product ids from the legacy title. Renaming a product after
// migrating would be undone the next time the migration runs: it would rebuild
// the same id from the old title and replace the document.
//
// Twelve titles describe one $10 5x7 print, and thirteen describe one $40 framed
// print. They don't collide on id, so nothing downstream would catch them — they
// would simply become 25 Square variations with the stock split between them.

const APPLY = process.argv.includes("--apply");

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

// Old title → canonical title. Matched exactly, so a title not listed here is
// left alone rather than guessed at.
const TITLE_MAP = new Map([
  ["5x7 Post Card", "5x7 Print"],
  ["Loose Postcard (5x7 in)", "5x7 Print"],
  ["Loose 5x7 Postcard", "5x7 Print"],
  ["Print, 5x7, Post-card", "5x7 Print"],
  ["Single postcard", "5x7 Print"],
  ["5×7 Print (Local Pickup)", "5x7 Print"], // U+00D7 → ASCII, and drops the
  // pickup note, which already lives in its subtitle
  ["8x10 print", "8x10 Print"], // casing only; a genuinely separate product
  ["Framed Print (Featured at De Fer Downtown July 2026)", "Framed 5x7 Print"],
  ["Framed 5x7 Print (Featured at De Fer Downtown)", "Framed 5x7 Print"],
  ["De Fer Downtown - Framed Print", "Framed 5x7 Print"],
]);

// The De Fer subtitles promise pickup "until end of July" — five weeks in the
// past, and live on the site. The show is in fact ongoing with no end date, so
// the replacement carries no date at all and can't go stale the same way.
const STALE_SUBTITLE = /end of july|stays? up until/i;
const DE_FER_SUBTITLE =
  "Hanging at De Fer Coffee, Downtown. If you're there, feel free to take it " +
  "off the wall — otherwise I'll ship it to you.";

const artworks = await client.fetch(
  `*[_type == "artwork" && count(customOptions) > 0]{
     _id, title, customOptions
   } | order(title asc)`
);

const edits = [];

for (const art of artworks) {
  (art.customOptions ?? []).forEach((opt, i) => {
    const newTitle = TITLE_MAP.get(opt.title);
    const subtitleIsStale = opt.subtitle && STALE_SUBTITLE.test(opt.subtitle);
    if (!newTitle && !subtitleIsStale) return;

    edits.push({
      docId: art._id,
      subject: art.title,
      index: i,
      oldTitle: opt.title,
      newTitle: newTitle ?? opt.title,
      oldSubtitle: opt.subtitle ?? "",
      newSubtitle: subtitleIsStale ? DE_FER_SUBTITLE : opt.subtitle ?? "",
      titleChanged: Boolean(newTitle && newTitle !== opt.title),
      subtitleChanged: Boolean(subtitleIsStale),
    });
  });
}

console.log(`\nSubjects scanned: ${artworks.length}`);
console.log(`Options to edit:  ${edits.length}`);
console.log(`  title renames:  ${edits.filter((e) => e.titleChanged).length}`);
console.log(`  stale subtitles:${edits.filter((e) => e.subtitleChanged).length}\n`);

for (const e of edits) {
  console.log(`  ${e.subject}`);
  if (e.titleChanged) {
    console.log(`      title    "${e.oldTitle}"`);
    console.log(`            →  "${e.newTitle}"`);
  }
  if (e.subtitleChanged) {
    console.log(`      subtitle "${e.oldSubtitle}"`);
    console.log(`            →  "${e.newSubtitle}"`);
  }
}

// Anything left over that still looks like a duplicate is worth seeing, since
// the map only covers what was known at the time it was written.
const remaining = new Map();
for (const art of artworks) {
  for (const opt of art.customOptions ?? []) {
    const title = TITLE_MAP.get(opt.title) ?? opt.title;
    remaining.set(title, (remaining.get(title) ?? 0) + 1);
  }
}
console.log("\n— Titles after this runs —");
for (const [title, count] of [...remaining].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(3)}  ${title}`);
}

if (!APPLY) {
  console.log("\nDry run — nothing written. Re-run with --apply.\n");
  process.exit(0);
}

// Patch by array index. Safe here because nothing else is writing concurrently
// and the read is moments old; a _key-based patch would be sturdier if this
// ever became a long-running job.
let written = 0;
for (const e of edits) {
  const patch = client.patch(e.docId);
  if (e.titleChanged) patch.set({ [`customOptions[${e.index}].title`]: e.newTitle });
  if (e.subtitleChanged)
    patch.set({ [`customOptions[${e.index}].subtitle`]: e.newSubtitle });
  await patch.commit();
  written++;
}

console.log(`\n✓ Updated ${written} options.`);
console.log("Re-run migrate-to-products.mjs --titles to confirm the grouping.\n");
