import { defineField, defineType } from "sanity";
import { PackageIcon } from "@sanity/icons";

// A product is one sellable thing: this print, this original, this magnet.
// It references a "Subject" (the artwork document) for images, description and
// story, and carries everything commerce needs on its own.
//
// The split exists because one subject can back several products — Cathedral of
// Learning has three separate originals plus a print, which the old single
// `originalPrice` field on artwork could not represent. It also maps 1:1 onto a
// Square catalog variation, which is what lets Square track stock at all.
//
// See docs/cart-checkout/product-model-migration.md.
export const product = defineType({
  name: "product",
  title: "Product",
  type: "document",
  icon: PackageIcon,
  fieldsets: [
    {
      name: "fulfillment",
      title: "Shipping & Fulfillment",
      options: { collapsible: true, collapsed: false },
    },
    {
      name: "integration",
      title: "Square & Legacy Links",
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: "subject",
      title: "Subject",
      type: "reference",
      to: [{ type: "artwork" }],
      description: "The artwork this product depicts. Supplies images and description.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: 'What this is, e.g. "5×7 Print", "Original (framed)", "Magnet".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "kind",
      title: "Format",
      type: "string",
      description:
        'What this physically is. Only "Print" and "Postcard" suppress the "want this as a print?" prompt — a magnet does not satisfy someone asking for a print, and silently switching that prompt off would cost the demand signal that tells you what to print next. Any format added later defaults to not suppressing it.',
      options: {
        list: [
          { title: "Original", value: "original" },
          { title: "Print", value: "print" },
          { title: "Postcard", value: "postcard" },
          { title: "Magnet", value: "magnet" },
          { title: "Sticker", value: "sticker" },
          { title: "Other", value: "other" },
        ],
      },
      initialValue: "print",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "price",
      title: "Price",
      type: "number",
      description: "In dollars.",
      validation: (rule) => rule.required().positive(),
    }),
    defineField({
      name: "quantity",
      title: "Opening Stock",
      type: "number",
      description:
        "How many exist. Always 1 for an original — that is what stops the same piece selling twice across the website and a market.",
      initialValue: 1,
      validation: (rule) => rule.integer().min(0),
    }),
    defineField({
      name: "soldOut",
      title: "Sold Out",
      type: "boolean",
      description:
        "Mirrored from Square by webhook — do not edit by hand, it will be overwritten.",
      initialValue: false,
      readOnly: true,
    }),
    defineField({
      name: "channel",
      title: "Channel",
      type: "string",
      description:
        "Where this is fulfilled. Etsy products are display-only: they link out and never enter the cart or the Square catalog.",
      options: {
        list: [
          { title: "Local (this site)", value: "local" },
          { title: "Etsy", value: "etsy" },
        ],
        layout: "radio",
      },
      initialValue: "local",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "etsyUrl",
      title: "Etsy URL",
      type: "url",
      description: "Required when channel is Etsy.",
      hidden: ({ document }) => document?.channel !== "etsy",
      validation: (rule) =>
        rule.custom((value, context) => {
          const channel = (context.document as { channel?: string } | undefined)?.channel;
          if (channel === "etsy" && !value) return "Etsy products need a URL to link to.";
          return true;
        }),
    }),
    defineField({
      name: "subtitle",
      title: "Subtitle",
      type: "string",
      description: "Optional note under the price, e.g. pickup or shipping instructions.",
    }),
    defineField({
      name: "visible",
      title: "Show on page",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "sortOrder",
      title: "Sort Order",
      type: "number",
      description: "Display order within a subject. Lower first.",
    }),

    // --- fulfillment ---------------------------------------------------------
    defineField({
      name: "shippingType",
      title: "Shipping Type",
      type: "string",
      description:
        "Drives what the buyer is charged. Framed bands by PACKED WEIGHT, not by what is in the frame: Framed (small) up to 16 oz, Framed (large) above it.",
      fieldset: "fulfillment",
      options: {
        list: [
          { title: "Magnet", value: "magnet" },
          { title: "Postcard", value: "postcard" },
          { title: "Print", value: "print" },
          { title: "Original (unframed)", value: "original" },
          { title: "Framed (small, ≤16 oz)", value: "framedSmall" },
          { title: "Framed (large, >16 oz)", value: "framedLarge" },
        ],
      },
    }),
    defineField({
      name: "shipWeightOz",
      title: "Packed Weight (oz)",
      type: "number",
      description: "Packed, not the piece alone. Decides the framed band.",
      fieldset: "fulfillment",
      validation: (rule) => rule.positive(),
    }),
    defineField({
      name: "shipLengthIn",
      title: "Box Length (in)",
      type: "number",
      fieldset: "fulfillment",
      validation: (rule) => rule.positive(),
    }),
    defineField({
      name: "shipWidthIn",
      title: "Box Width (in)",
      type: "number",
      fieldset: "fulfillment",
      validation: (rule) => rule.positive(),
    }),
    defineField({
      name: "shipHeightIn",
      title: "Box Height (in)",
      type: "number",
      fieldset: "fulfillment",
      validation: (rule) => rule.positive(),
    }),

    // --- integration ---------------------------------------------------------
    defineField({
      name: "squareVariationId",
      title: "Square Variation ID",
      type: "string",
      description:
        "Written by the seed script. Without it this product cannot be sold through checkout — Square only tracks stock for line items that reference a catalog object.",
      fieldset: "integration",
    }),
    defineField({
      name: "squareUrl",
      title: "Square Checkout Link (legacy)",
      type: "url",
      description:
        "Old one-off checkout link. Retired once the cart is live; kept so nothing breaks in the meantime.",
      fieldset: "integration",
    }),
    defineField({
      name: "venmoNote",
      title: "Venmo Note",
      type: "string",
      description:
        'Overrides the generated Venmo note, e.g. "3 postcards — reply with the 3 designs you want".',
      fieldset: "integration",
    }),
  ],
  orderings: [
    {
      title: "Subject, then sort order",
      name: "bySubject",
      by: [
        { field: "subject.title", direction: "asc" },
        { field: "sortOrder", direction: "asc" },
      ],
    },
    {
      title: "Price, High → Low",
      name: "priceDesc",
      by: [{ field: "price", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      subjectTitle: "subject.title",
      price: "price",
      visible: "visible",
      soldOut: "soldOut",
      channel: "channel",
      media: "subject.images.0",
    },
    prepare({ title, subjectTitle, price, visible, soldOut, channel, media }) {
      return {
        title: [subjectTitle, title].filter(Boolean).join(" — "),
        subtitle: [
          price != null ? `$${price.toLocaleString()}` : null,
          channel === "etsy" ? "Etsy" : null,
          soldOut ? "Sold out" : null,
          visible === false ? "Hidden" : null,
        ]
          .filter(Boolean)
          .join(" · "),
        media,
      };
    },
  },
});
