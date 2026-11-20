// Exercises every branch of src/lib/shipping.ts and src/lib/discounts.ts — the
// money logic the site owns outright. There's no test suite, so this is the regression
// check: run it after touching shipping or discount rules. No dependencies; Node
// runs it directly via type stripping.
//
//   npm run check:shipping

import { shippingCents, MissingShippingTypeError } from "../src/lib/shipping.ts";
import { bundleDiscountCents, stickerDiscountCents } from "../src/lib/discounts.ts";
const L = (shippingType: any, qty = 1, title?: string) => ({ shippingType, qty, title });
const cases: [string, any[], "ship" | "pickup", number | "throws"][] = [
  ["PRD: 3 postcards",                       [L("postcard", 3)],                          "ship", 300],
  ["PRD: magnet + print share a mailer",     [L("magnet"), L("print")],                   "ship", 500],
  ["PRD: 2 framed prints = 2 boxes",         [L("framedSmall", 2)],                       "ship", 2000],
  ["PRD: framed original + 3 magnets",       [L("framedLarge"), L("magnet", 3)],          "ship", 2000],
  ["PRD: anything, pickup",                  [L("framedLarge", 3), L("print")],           "pickup", 0],
  ["12 5x7 prints (postcard band)",          [L("postcard", 12)],                         "ship", 300],
  ["unframed original + postcard",           [L("original"), L("postcard")],              "ship", 1000],
  ["small + large framed",                   [L("framedSmall"), L("framedLarge")],        "ship", 3000],
  ["boxed waives the flat charge",           [L("framedSmall"), L("original")],           "ship", 1000],
  ["empty cart",                             [],                                          "ship", 0],
  ["missing type throws, named",             [L("print"), L(null, 1, "Mystery Print")],   "ship", "throws"],
  ["missing type is fine for pickup",        [L(null, 1, "Mystery Print")],               "pickup", 0],
  ["qty 0 line with missing type ignored",   [L("print"), L(null, 0, "Removed")],         "ship", 500],
];
let fail = 0;
for (const [name, lines, method, want] of cases) {
  let got: number | string;
  try { got = shippingCents(lines, method); }
  catch (e) { got = e instanceof MissingShippingTypeError ? `throws (${e.titles.join(",")})` : `other error: ${e}`; }
  const ok = want === "throws" ? String(got).startsWith("throws") : got === want;
  if (!ok) fail++;
  console.log(`${ok ? "✓" : "✗"} ${name.padEnd(40)} got ${got}${ok ? "" : `, want ${want}`}`);
}

// The 3-for-$25 deal (src/lib/discounts.ts) — the other money rule the site owns.
const D = (shippingType: any, qty: number, unitCents = 1000) => ({ shippingType, qty, unitCents });
const discountCases: [string, any[], number][] = [
  ["deal: 2 prints, no deal",                [D("postcard", 2)],                          0],
  ["deal: 3 prints = $25",                   [D("postcard", 3)],                          500],
  ["deal: 3 different designs",              [D("postcard", 1), D("postcard", 1), D("postcard", 1)], 500],
  ["deal: 4 prints = $25 + $10",             [D("postcard", 4)],                          500],
  ["deal: 6 prints = two deals",             [D("postcard", 6)],                          1000],
  ["deal: other bands don't count",          [D("postcard", 2), D("print", 1, 3000), D("magnet", 1, 800)], 0],
  ["deal: never a surcharge",                [D("postcard", 3, 500)],                     0],
];
for (const [name, lines, want] of discountCases) {
  const got = bundleDiscountCents(lines);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? "✓" : "✗"} ${name.padEnd(40)} got ${got}${ok ? "" : `, want ${want}`}`);
}

// The 2-for-$5 sticker deal. Stickers ship in the magnet band, so eligibility is
// the product's format, not its band.
const S = (kind: any, qty: number, unitCents = 300, shippingType: any = "magnet") => ({ kind, shippingType, qty, unitCents });
const stickerCases: [string, any[], number][] = [
  ["stickers: 1, no deal",                   [S("sticker", 1)],                           0],
  ["stickers: 2 = $5",                       [S("sticker", 2)],                           100],
  ["stickers: 2 different designs",          [S("sticker", 1), S("sticker", 1)],          100],
  ["stickers: 3 = $5 + $3",                  [S("sticker", 3)],                           100],
  ["stickers: 4 = two deals",                [S("sticker", 4)],                           200],
  ["stickers: magnets don't count",          [S("sticker", 1), S("magnet", 1, 800)],      0],
  ["stickers: not counted as prints",        [S("sticker", 2), D("postcard", 2)],         100],
];
for (const [name, lines, want] of stickerCases) {
  const got = stickerDiscountCents(lines);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? "✓" : "✗"} ${name.padEnd(40)} got ${got}${ok ? "" : `, want ${want}`}`);
}
const total = cases.length + discountCases.length + stickerCases.length;
console.log(fail ? `\n${fail} FAILED` : `\nall ${total} pass`);
process.exit(fail ? 1 : 0);
