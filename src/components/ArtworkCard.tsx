import { Badge, Card, Image, Text, Group, Stack } from "@mantine/core";
import { Link } from "react-router-dom";
import { urlFor } from "../lib/sanity";
import type { ArtworkSummary } from "../types/artwork";

interface ArtworkCardProps {
  artwork: ArtworkSummary;
}

// Build a short availability + price line so buyers can gauge affordability
// without opening every piece. Returns null when nothing is priced.
function priceSummary(artwork: ArtworkSummary): { label: string; sold: boolean } | null {
  const available: number[] = [];
  if (artwork.originalPrice != null && !artwork.originalSold)
    available.push(artwork.originalPrice);
  if (artwork.printEtsyPrice != null) available.push(artwork.printEtsyPrice);
  if (artwork.printLocalPrice != null && !artwork.printLocalSold)
    available.push(artwork.printLocalPrice);

  if (available.length > 0) {
    const min = Math.min(...available);
    const multiple = available.length > 1 || artwork.printEtsyPrice != null;
    return { label: `${multiple ? "From " : ""}$${min.toLocaleString()}`, sold: false };
  }

  // Nothing available, but something was priced → it sold out.
  const everPriced =
    artwork.originalPrice != null ||
    artwork.printEtsyPrice != null ||
    artwork.printLocalPrice != null;
  if (everPriced) return { label: "Sold", sold: true };

  return null;
}

export function ArtworkCard({ artwork }: ArtworkCardProps) {
  const primaryImage = artwork.images?.[0];
  const imageUrl = primaryImage
    ? urlFor(primaryImage.asset).width(600).auto("format").url()
    : undefined;

  const price = artwork.forSale ? priceSummary(artwork) : null;

  return (
    <Card
      component={Link}
      to={`/artwork/${artwork.slug.current}`}
      padding={0}
      radius={0}
      shadow="sm"
      style={{ textDecoration: "none", color: "inherit" }}
    >
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
        {price?.sold && (
          <Badge
            size="sm"
            variant="filled"
            color="dark"
            radius={0}
            style={{ position: "absolute", top: 8, right: 8 }}
          >
            Sold
          </Badge>
        )}
      </div>
      <Stack gap={4} p="sm">
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
        {price && !price.sold && (
          <Text size="sm" fw={600}>
            {price.label}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
