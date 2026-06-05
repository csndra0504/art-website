import { Anchor, createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "dark",
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
  headings: {
    fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
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
