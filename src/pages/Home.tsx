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
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

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

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const filtered = activeTags.size > 0
    ? artworks.filter((a) => [...activeTags].every((t) => a.tags?.includes(t)))
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
            variant={activeTags.size === 0 ? "filled" : "outline"}
            color="dark"
            radius={0}
            size="md"
            style={{ cursor: "pointer" }}
            onClick={() => setActiveTags(new Set())}
          >
            All
          </Badge>
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={activeTags.has(tag) ? "filled" : "outline"}
              color="dark"
              radius={0}
              size="md"
              style={{ cursor: "pointer" }}
              onClick={() => toggleTag(tag)}
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
