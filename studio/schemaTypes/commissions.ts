import { defineArrayMember, defineField, defineType } from "sanity";

export const commissions = defineType({
  name: "commissionsPage",
  title: "Commissions Page",
  type: "document",
  fields: [
    defineField({
      name: "featuredImage",
      title: "Featured Image",
      type: "image",
      description: "The hero image shown at the top of the commissions page (e.g. your house painting)",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "intro",
      title: "Intro Text",
      type: "array",
      of: [{ type: "block" }],
      description: "Introductory paragraph about your commission work",
    }),
    defineField({
      name: "pricingTiers",
      title: "Pricing Tiers",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "label", title: "Label", type: "string" }),
            defineField({ name: "price", title: "Price (e.g. £200)", type: "string" }),
            defineField({ name: "description", title: "Description", type: "text", rows: 2 }),
          ],
          preview: {
            select: { title: "label", subtitle: "price" },
          },
        }),
      ],
    }),
    defineField({
      name: "framingNote",
      title: "Framing Note",
      type: "text",
      rows: 2,
      description: "Short note about framing being available at additional cost",
    }),
    defineField({
      name: "largerFormatNote",
      title: "Larger Format Note",
      type: "text",
      rows: 2,
      description: "Note about flexibility for larger format requests",
    }),
    defineField({
      name: "contactEmail",
      title: "Contact Email",
      type: "string",
      description: "Email address commission requests will be sent to",
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      media: "featuredImage",
    },
    prepare({ media }) {
      return { title: "Commissions Page", media };
    },
  },
  // Singleton — only one document of this type should exist
  __experimental_actions: ["update", "publish"],
});
