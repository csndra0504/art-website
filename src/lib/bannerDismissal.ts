// Banner dismissal lives in localStorage so it survives closing the tab, but
// expires: a dismissed banner comes back after a week. The exception is the
// signup popup once someone has actually subscribed, which is stored as
// "forever". Every access is wrapped because storage can be blocked or throw
// (private windows, cleared site data) — the banner then just shows.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const FOREVER = "forever";

export const EVENT_BANNER_KEY = "event-banner-dismissed";
export const SIGNUP_BANNER_KEY = "email-signup-banner-dismissed";
export const HOLIDAY_BANNER_KEY = "holiday-banner-dismissed";

// How long a temporary dismissal lasts is decided when it's read, not when it's
// written, so one stored timestamp can mean "a week" to a banner and "a month"
// to the signup popup.
export function isDismissed(key: string, maxAgeMs: number = WEEK_MS): boolean {
  try {
    const value = localStorage.getItem(key);
    if (!value) return false;
    if (value === FOREVER) return true;
    const dismissedAt = Number(value);
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < maxAgeMs;
  } catch {
    return false;
  }
}

/** Record a temporary dismissal; pass the same `maxAgeMs` to `isDismissed`. */
export function dismissNow(key: string): void {
  try {
    // Never downgrade a permanent dismissal to a temporary one.
    if (localStorage.getItem(key) === FOREVER) return;
    localStorage.setItem(key, String(Date.now()));
  } catch {
    // Storage unavailable: the dismissal just won't persist.
  }
}

export const dismissForAWeek = dismissNow;

export function dismissForever(key: string): void {
  try {
    localStorage.setItem(key, FOREVER);
  } catch {
    // Storage unavailable: the dismissal just won't persist.
  }
}
