import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Container,
  Group,
  SimpleGrid,
  Text,
  Loader,
  Center,
} from "@mantine/core";
import { getArtworks } from "../lib/queries";
import { ArtworkCard } from "../components/ArtworkCard";
import type { ArtworkSummary } from "../types/artwork";

export function Home() {
  const [artworks, setArtworks] = useState<ArtworkSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    getArtworks()
      .then(setArtworks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const artwork of artworks) {
      artwork.tags?.forEach((t) => tagSet.add(t));
    }
    return Array.from(tagSet).sort();
  }, [artworks]);

  const filtered = activeTag
    ? artworks.filter((a) => a.tags?.includes(activeTag))
    : artworks;

  if (loading) {
    return (
      <Center py="xl">
        <Loader color="dark" />
      </Center>
    );
  }

  if (error) {
    return (
      <Container size="lg" py="xl">
        <Text c="red">Failed to load artworks: {error}</Text>
      </Container>
    );
  }

  if (artworks.length === 0) {
    return (
      <Container size="lg" py="xl">
        <Text c="dimmed">No artworks yet.</Text>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      {allTags.length > 0 && (
        <Group gap="xs" mb="lg">
          <Badge
            variant={activeTag === null ? "filled" : "outline"}
            color="dark"
            radius={0}
            size="md"
            style={{ cursor: "pointer" }}
            onClick={() => setActiveTag(null)}
          >
            All
          </Badge>
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={activeTag === tag ? "filled" : "outline"}
              color="dark"
              radius={0}
              size="md"
              style={{ cursor: "pointer" }}
              onClick={() => setActiveTag(tag === activeTag ? null : tag)}
            >
              {tag}
            </Badge>
          ))}
        </Group>
      )}

      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="lg">
        {filtered.map((artwork) => (
          <ArtworkCard key={artwork._id} artwork={artwork} />
        ))}
      </SimpleGrid>
    </Container>
  );
}
