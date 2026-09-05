import type { StructureResolver } from "sanity/structure";

// Desk structure. The default flat list per type stops being usable once one
// subject backs several products — 45 subjects produce ~82 products, and the
// questions you actually ask are "what does this piece sell as?" and "what still
// needs attention?", neither of which a flat list answers.

const FORMATS: { value: string; title: string }[] = [
  { value: "original", title: "Originals" },
  { value: "print", title: "Prints" },
  { value: "postcard", title: "Postcards" },
  { value: "magnet", title: "Magnets" },
  { value: "sticker", title: "Stickers" },
  { value: "other", title: "Other" },
];

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      // Subjects first: the artwork is still how you think about the work.
      S.documentTypeListItem("artwork").title("Subjects"),

      S.divider(),

      S.listItem()
        .title("Products")
        .child(
          S.list()
            .title("Products")
            .items([
              // Drill subject → its products. Mirrors the data model, and is the
              // fastest way to check one piece is completely represented.
              S.listItem()
                .title("By subject")
                .child(
                  S.documentTypeList("artwork")
                    .title("By subject")
                    .defaultOrdering([{ field: "title", direction: "asc" }])
                    .child((subjectId) =>
                      S.documentList()
                        .title("Products")
                        .filter('_type == "product" && subject._ref == $subjectId')
                        .params({ subjectId })
                        .defaultOrdering([{ field: "sortOrder", direction: "asc" }])
                    )
                ),

              // Grouping by format is how you normalise titles: every postcard
              // in one list makes five spellings of the same thing obvious.
              S.listItem()
                .title("By format")
                .child(
                  S.list()
                    .title("By format")
                    .items(
                      FORMATS.map((f) =>
                        S.listItem()
                          .id(f.value)
                          .title(f.title)
                          .child(
                            S.documentList()
                              .title(f.title)
                              .filter('_type == "product" && kind == $kind')
                              .params({ kind: f.value })
                              .defaultOrdering([{ field: "title", direction: "asc" }])
                          )
                      )
                    )
                ),

              S.divider(),

              // Worklists. These exist because a product missing either field is
              // silently broken rather than visibly wrong: no shippingType means
              // the shipping calculation has nothing to charge on, and no
              // squareVariationId means Square can't track its stock.
              S.listItem()
                .title("⚠ Missing shipping type")
                .child(
                  S.documentList()
                    .title("Missing shipping type")
                    .filter('_type == "product" && !defined(shippingType)')
                    .defaultOrdering([{ field: "title", direction: "asc" }])
                ),

              S.listItem()
                .title("⚠ Not in Square yet")
                .child(
                  S.documentList()
                    .title("Not in Square yet")
                    // Etsy products are display-only and never enter the Square
                    // catalog, so their missing id is expected, not a problem.
                    .filter(
                      '_type == "product" && channel != "etsy" && !defined(squareVariationId)'
                    )
                    .defaultOrdering([{ field: "title", direction: "asc" }])
                ),

              S.listItem()
                .title("Sold out")
                .child(
                  S.documentList()
                    .title("Sold out")
                    .filter('_type == "product" && soldOut == true')
                    .defaultOrdering([{ field: "title", direction: "asc" }])
                ),

              S.divider(),

              S.listItem()
                .title("All products")
                .child(
                  S.documentTypeList("product")
                    .title("All products")
                    .defaultOrdering([{ field: "title", direction: "asc" }])
                ),
            ])
        ),

      S.divider(),

      S.documentTypeListItem("event").title("Events"),
    ]);
