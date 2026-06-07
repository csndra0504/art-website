import { Badge, Button, Card, Image, Text, Group, Stack } from "@mantine/core";
import { Link } from "react-router-dom";
import { urlFor } from "../lib/sanity";
import type { ArtworkSummary } from "../types/artwork";

interface ArtworkCardProps {
  artwork: ArtworkSummary;
}

// Break pricing into the original (one-of-a-kind, higher) and the entry-level
// print price so the card reads like a shop, not just a "from $X" number.
function pricing(a: ArtworkSummary) {
  const originalListed = a.originalPrice != null;
  const originalAvailable = originalListed && !a.originalSold;

  const printPrices: number[] = [];
  if (a.printEtsyPrice != null) printPrices.push(a.printEtsyPrice);
  if (a.printLocalPrice != null && !a.printLocalSold)
    printPrices.push(a.printLocalPrice);
  const printsFrom = printPrices.length ? Math.min(...printPrices) : null;

  const everListed =
    originalListed || a.printEtsyPrice != null || a.printLocalPrice != null;
  const anyAvailable = originalAvailable || printsFrom != null;

  return {
    originalListed,
    originalPrice: a.originalPrice,
    originalSold: !!a.originalSold,
    printsFrom,
    anyAvailable,
    soldOut: everListed && !anyAvailable,
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

        <Stack gap={2} px="sm" pt="sm">
          <Group justify="space-between" gap="xs" wrap="nowrap">
            <Text size="sm" fw={500} truncate>
              {artwork.title}
            </Text>
            {artwork.year && (
              <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                {artwork.year}
              </Text>
            )}
          </Group>
          {artwork.medium && (
            <Text size="xs" c="dimmed">
              {artwork.medium}
            </Text>
          )}
        </Stack>
      </Link>

      {/* Price + buy row sits outside the card link so the button is its own
          tap target (no nested links). */}
      {p && (p.originalListed || p.printsFrom != null) && (
        <Group justify="space-between" align="flex-end" wrap="nowrap" gap="xs" px="sm" pt={6} pb="sm" mt="auto">
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
            {p.printsFrom != null && (
              <Text size="sm" fw={600}>
                <Text span size="xs" fw={500} c="dimmed">
                  Prints from{" "}
                </Text>
                {money(p.printsFrom)}
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
              style={{ flexShrink: 0 }}
            >
              Buy
            </Button>
          ) : (
            <Text size="xs" c="dimmed" fw={500} style={{ flexShrink: 0 }}>
              Sold out
            </Text>
          )}
        </Group>
      )}
    </Card>
  );
}
