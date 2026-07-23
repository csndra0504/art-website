import { MantineProvider } from "@mantine/core";
import posthog from "posthog-js";
import { PostHogProvider, PostHogErrorBoundary } from "@posthog/react";
import { theme, cssVariablesResolver } from "../lib/theme";
import { Layout } from "./Layout";

// Root route element. Holds every app-wide provider so they're part of the
// server-rendered tree (they used to live in main.tsx, which isn't rendered
// under SSG). `posthog` is initialised client-side in main.tsx; during the
// static build it's an uninitialised stub, and the `posthog?.capture(...)` call
// sites only fire from client event handlers, so this is safe to render in Node.
//
// The site is light-only, so we force the light color scheme — light is the
// CSS-variable default, so no ColorSchemeScript is needed and there's no
// hydration mismatch.
export function RootLayout() {
  return (
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary>
        <MantineProvider
          theme={theme}
          cssVariablesResolver={cssVariablesResolver}
          defaultColorScheme="light"
          forceColorScheme="light"
        >
          <Layout />
        </MantineProvider>
      </PostHogErrorBoundary>
    </PostHogProvider>
  );
}
