// Banner dismissal lives in localStorage so it survives closing the tab, but
// expires: a dismissed banner comes back after a week. The exception is the
// signup banner once someone has actually subscribed, which is stored as
// "forever". Every access is wrapped because storage can be blocked or throw
// (private windows, cleared site data) — the banner then just shows.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const FOREVER = "forever";

export const EVENT_BANNER_KEY = "event-banner-dismissed";
export const SIGNUP_BANNER_KEY = "email-signup-banner-dismissed";

export function isDismissed(key: string): boolean {
  try {
    const value = localStorage.getItem(key);
    if (!value) return false;
    if (value === FOREVER) return true;
    const dismissedAt = Number(value);
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < WEEK_MS;
  } catch {
    return false;
  }
}

export function dismissForAWeek(key: string): void {
  try {
    // Never downgrade a permanent dismissal to a temporary one.
    if (localStorage.getItem(key) === FOREVER) return;
    localStorage.setItem(key, String(Date.now()));
  } catch {
    // Storage unavailable: the dismissal just won't persist.
  }
}

export function dismissForever(key: string): void {
  try {
    localStorage.setItem(key, FOREVER);
  } catch {
    // Storage unavailable: the dismissal just won't persist.
  }
}
