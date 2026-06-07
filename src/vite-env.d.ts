/// <reference types="vite/client" />

interface Window {
  // Google Analytics (gtag.js) — loaded from index.html.
  gtag?: (
    command: string,
    eventNameOrId: string,
    params?: Record<string, unknown>
  ) => void;
  dataLayer?: unknown[];
}
