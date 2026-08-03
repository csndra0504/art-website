import { defineField, defineType } from "sanity";
import { ImageIcon } from "@sanity/icons";

export const artwork = defineType({
  name: "artwork",
  title: "Artwork",
  type: "document",
  icon: ImageIcon,
  fieldsets: [
    {
      name: "purchase",
      title: "Purchase Options",
      options: { collapsible: true, collapsed: false },
    },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "images",
      title: "Images",
      type: "array",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "alt",
              title: "Alt Text",
              type: "string",
              validation: (rule) => rule.required(),
            }),
          ],
        },
      ],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "array",
      of: [{ type: "block" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "medium",
      title: "Medium",
      type: "string",
      description: 'e.g. "Oil on canvas", "Watercolor", "Digital"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "dimensions",
      title: "Dimensions",
      type: "string",
      description: 'e.g. "24 × 36 in" or "60 × 90 cm"',
    }),
    defineField({
      name: "year",
      title: "Year",
      type: "number",
      validation: (rule) => rule.integer().min(1900).max(2100),
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "forSale",
      title: "For Sale",
      type: "boolean",
      description: "Master toggle — enables the purchase section on the detail page.",
      initialValue: false,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "originalPrice",
      title: "Original Price",
      type: "number",
      description: "Price of the original artwork in dollars.",
      fieldset: "purchase",
      validation: (rule) => rule.positive(),
    }),
    defineField({
      name: "originalSold",
      title: "Original Sold",
      type: "boolean",
      description: "Mark the original as sold. Price will still display with a Sold badge.",
      fieldset: "purchase",
      initialValue: false,
    }),
    defineField({
      name: "originalSquareUrl",
      title: "Original — Square Checkout Link",
      type: "url",
      description:
        "Paste a Square checkout link for the original (Square Dashboard → Online → Checkout Links). When set, buyers see a one-tap \"Buy with card\" button. Venmo stays as a fallback.",
      fieldset: "purchase",
    }),
    defineField({
      name: "printEtsyUrl",
      title: "Print — Etsy URL",
      type: "url",
      description: "Link to the Etsy listing for prints of this piece.",
      fieldset: "purchase",
    }),
    defineField({
      name: "printEtsyPrice",
      title: "Print — Etsy Price",
      type: "number",
      description: "Price for the Etsy print, in dollars (displayed on the detail page).",
      fieldset: "purchase",
      validation: (rule) => rule.positive(),
    }),
    defineField({
      name: "printLocalPrice",
      title: "Print — Local Pickup Price",
      type: "number",
      description: "Price for a print with local pickup, in dollars.",
      fieldset: "purchase",
      validation: (rule) => rule.positive(),
    }),
    defineField({
      name: "printLocalSold",
      title: "Print — Local Pickup Sold",
      type: "boolean",
      description: "Mark the local pickup print as sold.",
      fieldset: "purchase",
      initialValue: false,
    }),
    defineField({
      name: "customOptions",
      title: "Custom Purchase Options",
      type: "array",
      description:
        "Additional purchase options with a custom title and price. Each shows on the detail page when its toggle is on.",
      fieldset: "purchase",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "title",
              title: "Title",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "kind",
              title: "Type",
              type: "string",
              description:
                "What this option sells. \"Print\" (which includes postcards) hides the \"request a print\" prompt on this piece.",
              options: {
                list: [
                  { title: "Print", value: "print" },
                  { title: "Original", value: "original" },
                ],
                layout: "radio",
              },
              initialValue: "print",
            }),
            defineField({
              name: "price",
              title: "Price",
              type: "number",
              description: "Price in dollars.",
              validation: (rule) => rule.required().positive(),
            }),
            defineField({
              name: "subtitle",
              title: "Subtitle",
              type: "string",
              description:
                "Optional note shown under the price, e.g. pickup or shipping instructions.",
            }),
            defineField({
              name: "squareUrl",
              title: "Square Checkout Link",
              type: "url",
              description:
                "Optional Square checkout link. When set, this option shows a \"Buy with card\" button instead of Venmo.",
            }),
            defineField({
              name: "etsyUrl",
              title: "Etsy URL",
              type: "url",
              description:
                "Optional. When set, this option shows an \"Order Print\" button linking to Etsy instead of the Square/Venmo buttons. Pair with a subtitle like \"Ships via Etsy\".",
            }),
            defineField({
              name: "venmoNote",
              title: "Venmo Note",
              type: "string",
              description:
                "Optional. Pre-fills the Venmo payment note instead of the default \"Title — Artwork\". Use to ask the buyer for info, e.g. \"3 postcards — reply with the 3 designs you want\".",
            }),
            defineField({
              name: "visible",
              title: "Show on page",
              type: "boolean",
              description: "Turn off to hide this option from the detail page.",
              initialValue: true,
            }),
          ],
          preview: {
            select: { title: "title", price: "price", visible: "visible" },
            prepare({ title, price, visible }) {
              return {
                title: title ?? "Untitled option",
                subtitle: [
                  price != null ? `$${price.toLocaleString()}` : null,
                  visible === false ? "Hidden" : null,
                ]
                  .filter(Boolean)
                  .join(" · "),
              };
            },
          },
        },
      ],
    }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "highlightLabel",
      title: "Highlight Label",
      type: "string",
      description:
        'Optional ribbon shown on the card and detail page, e.g. "As seen on Instagram", "Bestseller", "Just one left". Leave blank for none.',
    }),
    defineField({
      name: "sortOrder",
      title: "Sort Order",
      type: "number",
      description: "Lower numbers appear first. Leave blank to sort by date.",
    }),
  ],
  orderings: [
    {
      title: "Sort Order",
      name: "sortOrder",
      by: [{ field: "sortOrder", direction: "asc" }],
    },
    {
      title: "Year, New → Old",
      name: "yearDesc",
      by: [{ field: "year", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "medium",
      media: "images.0",
    },
  },
});
