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
      name: "featured",
      title: "Featured",
      type: "boolean",
      initialValue: false,
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
