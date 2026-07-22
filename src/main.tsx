import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { theme, cssVariablesResolver } from "./lib/theme";
import App from "./App";
import posthog from "posthog-js";
import { PostHogErrorBoundary, PostHogProvider } from "@posthog/react";

posthog.init(import.meta.env.VITE_POSTHOG_PROJECT_TOKEN, {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  defaults: "2026-01-30",
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary>
        <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
          <App />
        </MantineProvider>
      </PostHogErrorBoundary>
    </PostHogProvider>
  </StrictMode>
);
