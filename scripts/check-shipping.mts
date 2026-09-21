// Exercises every branch of src/lib/shipping.ts — the one piece of money logic
// the site owns outright. There's no test suite, so this is the regression
// check: run it after touching shipping rules or rates. No dependencies; Node
// runs it directly via type stripping.
//
//   npm run check:shipping

import { shippingCents, MissingShippingTypeError } from "../src/lib/shipping.ts";
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
console.log(fail ? `\n${fail} FAILED` : `\nall ${cases.length} pass`);
process.exit(fail ? 1 : 0);
