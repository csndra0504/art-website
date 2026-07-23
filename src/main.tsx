import { ViteReactSSG } from "vite-react-ssg";
import "@mantine/core/styles.css";
import posthog from "posthog-js";
import { routes } from "./App";

// posthog-js is browser-only. This module is also imported by the static build
// (Node, no `window`), so initialise only on the client. The provider itself
// lives in RootLayout so it's part of the server-rendered tree.
if (typeof window !== "undefined") {
  posthog.init(import.meta.env.VITE_POSTHOG_PROJECT_TOKEN, {
    api_host: import.meta.env.VITE_POSTHOG_HOST,
    defaults: "2026-01-30",
  });
}

// vite-react-ssg owns app creation: at build it renders each route to static
// HTML; on the client it hydrates.
export const createRoot = ViteReactSSG({ routes });
