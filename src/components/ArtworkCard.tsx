import { Badge, Box, Button, Card, Image, Text, Stack } from "@mantine/core";
import { Link } from "react-router-dom";
import { offersFor } from "../lib/offers";
import { urlFor } from "../lib/sanity";
import type { ArtworkSummary } from "../types/artwork";
import classes from "./ArtworkCard.module.css";

interface ArtworkCardProps {
  artwork: ArtworkSummary;
}

// Break pricing into the original (one-of-a-kind, higher) and the entry-level
// price so the card reads like a shop, not just a "from $X" number.
function pricing(a: ArtworkSummary) {
  const o = offersFor(a);
  return {
    originalListed: !!o.original,
    originalPrice: o.original?.price,
    originalSold: o.originalSold,
    fromPrice: o.fromPrice,
    anyAvailable: o.anyAvailable,
    soldOut: o.soldOut,
  };
}

function money(n: number) {
  return `$${n.toLocaleString()}`;
}

export function ArtworkCard({ artwork }: ArtworkCardProps) {
  const primaryImage = artwork.images?.[0];
  const imageUrl = primaryImage
    ? urlFor(primaryImage.asset).width(600).auto("format").url()
    : undefined;

  const to = `/artwork/${artwork.slug.current}`;
  const p = artwork.forSale ? pricing(artwork) : null;
  const meta = [artwork.medium, artwork.year].filter(Boolean).join(" · ");

  return (
    <Card
      padding={0}
      radius={0}
      shadow="sm"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
        <div style={{ position: "relative" }}>
          <Image
            src={imageUrl}
            alt={primaryImage?.alt ?? artwork.title}
            style={{ aspectRatio: "3 / 4", objectFit: "cover" }}
          />
          {artwork.highlightLabel && (
            <Badge
              size="sm"
              variant="filled"
              color="brick.6"
              radius={0}
              style={{ position: "absolute", top: 8, left: 8 }}
            >
              {artwork.highlightLabel}
            </Badge>
          )}
          {p?.soldOut && (
            <Badge
              size="sm"
              variant="filled"
              color="red"
              radius={0}
              style={{ position: "absolute", top: 8, right: 8 }}
            >
              Sold
            </Badge>
          )}
        </div>

        {/* Title over a single meta line: at two-up phone widths there isn't
            room to put the year on the title row without truncating names. */}
        <Stack gap={2} px="sm" pt="sm">
          <Text size="sm" fw={500} lineClamp={2}>
            {artwork.title}
          </Text>
          {meta && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {meta}
            </Text>
          )}
        </Stack>
      </Link>

      {/* Price + buy row sits outside the card link so the button is its own
          tap target (no nested links). */}
      {p && (p.originalListed || p.fromPrice != null) && (
        <Box className={classes.buyRow} px="sm" pt={6} pb="sm">
          <Stack gap={0} style={{ minWidth: 0 }}>
            {p.originalListed && (
              <Text size="sm" fw={600}>
                <Text span size="xs" fw={500} c="dimmed">
                  Original{" "}
                </Text>
                <Text
                  span
                  td={p.originalSold ? "line-through" : undefined}
                  c={p.originalSold ? "dimmed" : undefined}
                >
                  {money(p.originalPrice!)}
                </Text>
                {p.originalSold && (
                  <Text span size="xs" c="dimmed">
                    {" "}
                    · Sold
                  </Text>
                )}
              </Text>
            )}
            {p.fromPrice != null && (
              <Text size="sm" fw={600}>
                {/* "From", not "Prints from": the cheapest non-original may be a
                    magnet or a postcard, and the card doesn't discriminate. */}
                <Text span size="xs" fw={500} c="dimmed">
                  From{" "}
                </Text>
                {money(p.fromPrice)}
              </Text>
            )}
          </Stack>

          {p.anyAvailable ? (
            <Button
              component={Link}
              to={to}
              color="dark"
              radius={0}
              size="xs"
              className={classes.buyAction}
            >
              Buy
            </Button>
          ) : (
            <Text size="xs" c="dimmed" fw={500} className={classes.soldNote}>
              Sold out
            </Text>
          )}
        </Box>
      )}
    </Card>
  );
}
