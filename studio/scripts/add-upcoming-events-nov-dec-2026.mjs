import { createClient } from "@sanity/client";
import { homedir } from "node:os";
import { readFileSync } from "node:fs";

// One-off: adds the confirmed (accepted / locked-in) events from Nov 20 to
// Dec 19, 2026. Applied, waitlisted and tentative events are left out.
// Dry run by default; --apply writes. Deterministic ids make reruns safe.

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

const para = (key, text) => ({
  _key: key,
  _type: "block",
  style: "normal",
  markDefs: [],
  children: [{ _key: key + "s", _type: "span", text, marks: [] }],
});

const events = [
  {
    _id: "event-allys-shop-market-house-2026-11-20",
    title: "Working Ally Bartoszewicz's Shop - Lawrenceville Market House",
    date: "2026-11-20T12:00:00-05:00",
    description: [
      para("a", "I'll be working the floor at Ally Bartoszewicz's shop inside the Lawrenceville Market House on Butler Street on Friday, November 20, from noon to 6 p.m., with my own work on the table alongside hers."),
      para("b", "I'll have magnets, postcards, and prints of Pittsburgh places. Thank you to Ally for having me back. Stop by for some holiday shopping."),
    ],
  },
  {
    _id: "event-handmade-arcade-holiday-market-2026-12-04",
    title: "Handmade Arcade Holiday Market - David L. Lawrence Convention Center",
    date: "2026-12-04T12:00:00-05:00",
    link: "https://www.eventeny.com/events/2026-holiday-market-30121/",
    description: [
      para("a", "Handmade Arcade is a Pittsburgh nonprofit that supports makers, and its Holiday Market is one of the city's biggest handmade shopping weekends. It runs December 4 to 6 at the David L. Lawrence Convention Center downtown. Tickets are sold through Eventeny."),
      para("b", "I'll be there with prints, originals, magnets, and postcards of Pittsburgh places. Thank you to the Handmade Arcade team for having me."),
    ],
  },
  {
    _id: "event-costar-brewing-holiday-craft-fair-2026-12-11",
    title: "Holiday Craft Fair - CoStar Brewing",
    date: "2026-12-11T17:00:00-05:00",
    description: [
      para("a", "CoStar Brewing is hosting a holiday craft fair with local makers on Friday, December 11, from 5 to 8 p.m. I'll be there with prints, magnets, and postcards of Pittsburgh places."),
      para("b", "Thank you to CoStar Brewing for having me. I'll be back for a second night on Wednesday, December 16, from 5 to 8 p.m."),
    ],
  },
  {
    _id: "event-costar-brewing-holiday-craft-fair-2026-12-16",
    title: "Holiday Craft Fair (second night) - CoStar Brewing",
    date: "2026-12-16T17:00:00-05:00",
    description: [
      para("a", "I'm back at CoStar Brewing's holiday craft fair on Wednesday, December 16, from 5 to 8 p.m., with prints, magnets, and postcards of Pittsburgh places."),
      para("b", "Thank you to CoStar Brewing for having me for a second night."),
    ],
  },
  {
    _id: "event-brighter-days-holiday-mini-market-2026-12-19",
    title: "Holiday Mini Market - Brighter Days Gallery, Penn Avenue",
    date: "2026-12-19T12:00:00-05:00",
    description: [
      para("a", "Brighter Days Gallery, a new gallery on Penn Avenue run by quilt artist Amanda, is hosting an indoor holiday mini market on Saturday, December 19, from noon to 4 p.m., snow or shine."),
      para("b", "I'll have prints, magnets, and postcards of Pittsburgh places. Thank you to Amanda and Brighter Days for having me."),
    ],
  },
];

for (const e of events) {
  const doc = { _type: "event", ...e };
  console.log(apply ? "writing" : "dry run", doc._id, doc.date, doc.title);
  if (apply) await client.createOrReplace(doc);
}
