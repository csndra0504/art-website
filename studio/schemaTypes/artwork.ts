import { defineField, defineType } from "sanity";
import { ImageIcon } from "@sanity/icons";

export const artwork = defineType({
  name: "artwork",
  title: "Artwork",
  type: "document",
  icon: ImageIcon,
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
      initialValue: false,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "purchaseUrl",
      title: "Purchase URL",
      type: "url",
    }),
    defineField({
      name: "price",
      title: "Price",
      type: "number",
      validation: (rule) => rule.positive(),
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
