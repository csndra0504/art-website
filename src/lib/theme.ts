import { Anchor, createTheme } from "@mantine/core";
import type { CSSVariablesResolver } from "@mantine/core";

const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const theme = createTheme({
  primaryColor: "dark",
  // Body & UI text in a clean sans for readability; headings stay in the
  // Playfair serif for the editorial, gallery feel.
  fontFamily: SANS,
  headings: {
    fontFamily: SERIF,
  },
  colors: {
    brand: [
      "#fafaf8",
      "#f5f5f0",
      "#e8e8e0",
      "#d4d4c8",
      "#b8b8a8",
      "#9a9a88",
      "#7a7a68",
      "#5a5a48",
      "#3a3a28",
      "#1a1a08",
    ],
    brick: [
      "#fbecea",
      "#f3d3cd",
      "#e6a79c",
      "#d97a68",
      "#cd543d",
      "#c63d23",
      "#a8341d",
      "#8a2a18",
      "#6c2113",
      "#4e170d",
    ],
  },
  other: {
    bgBase: "#FAFAF8",
  },
  components: {
    Anchor: Anchor.extend({
      defaultProps: {
        c: "brick.6",
        underline: "always",
      },
    }),
  },
});

// Mantine's default `dimmed` (gray-6) sits at ~3:1 against the #FAFAF8 page —
// below the WCAG AA 4.5:1 floor. Override it with a warm gray (~5:1) so all the
// secondary `c="dimmed"` text across the site reads clearly while staying
// visibly subordinate to the near-black primary text.
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    "--mantine-color-dimmed": "#6e6e5e",
  },
  light: {},
  dark: {},
});
