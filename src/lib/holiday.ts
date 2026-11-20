import { useEffect, useState } from "react";
import { HOLIDAY } from "./siteContent";

// What a visitor should be told about Christmas delivery, given today's date.
// Dates live in siteContent.ts.

export interface HolidayShipping {
  /** One sentence, short enough for the banner. */
  headline: string;
  /** Market days still ahead, as "Dec 12". Empty once they've all passed. */
  pickup: string[];
  /** True once the flat-item cutoff has passed: new orders may not arrive in time. */
  pastCutoff: boolean;
}

// Local calendar date as YYYY-MM-DD. ISO date strings sort chronologically, so
// plain string comparison is enough everywhere below.
function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Built from the parts rather than `new Date("YYYY-MM-DD")`, which parses as UTC
// and shows the previous day in US time zones.
function label(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function holidayShipping(today: string): HolidayShipping | null {
  if (today < HOLIDAY.startDate || today > HOLIDAY.endDate) return null;

  const pickup = HOLIDAY.pickupDates.filter((d) => d >= today).map(label);
  const cutoff = label(HOLIDAY.cutoff);
  const framed = label(HOLIDAY.framedCutoff);

  if (today <= HOLIDAY.framedCutoff) {
    return {
      headline: `Order by ${cutoff} for delivery by Christmas (framed pieces: ${framed}).`,
      pickup,
      pastCutoff: false,
    };
  }
  if (today <= HOLIDAY.cutoff) {
    return {
      headline: `Order by ${cutoff} for delivery by Christmas. Framed pieces closed ${framed}: choose pickup or email me.`,
      pickup,
      pastCutoff: false,
    };
  }
  return {
    headline: `The ${cutoff} shipping cutoff has passed, so new orders may not arrive by Christmas.`,
    pickup,
    pastCutoff: true,
  };
}

/** "Dec 12, Dec 16 or Dec 19" */
export function joinDates(dates: string[]): string {
  if (dates.length <= 1) return dates.join("");
  return `${dates.slice(0, -1).join(", ")} or ${dates[dates.length - 1]}`;
}

// null on the server and first client render, then filled in after mount. The
// pages are prerendered at build time, so reading the date during render would
// bake the build day into the HTML and mismatch on hydration.
export function useHolidayShipping(): HolidayShipping | null {
  const [value, setValue] = useState<HolidayShipping | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(holidayShipping(localDate(new Date())));
  }, []);
  return value;
}
