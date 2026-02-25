import { Card, Image, Text, Group, Stack } from "@mantine/core";
import { Link } from "react-router-dom";
import { urlFor } from "../lib/sanity";
import type { ArtworkSummary } from "../types/artwork";

interface ArtworkCardProps {
  artwork: ArtworkSummary;
}

export function ArtworkCard({ artwork }: ArtworkCardProps) {
  const imageUrl = urlFor(artwork.image).width(600).auto("format").url();

  return (
    <Card
      component={Link}
      to={`/artwork/${artwork.slug.current}`}
      padding={0}
      radius={0}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <Image
        src={imageUrl}
        alt={artwork.image.alt ?? artwork.title}
        style={{ aspectRatio: "3 / 4", objectFit: "cover" }}
      />
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
      </Stack>
    </Card>
  );
}
