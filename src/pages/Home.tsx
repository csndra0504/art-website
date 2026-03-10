import { useEffect, useMemo, useState } from "react";
import {
  Anchor,
  Badge,
  Container,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
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
    <Container size="lg">
      <Stack align="center" py={60} mb="xl">
        <Title order={1} ta="center" fw={700} style={{ letterSpacing: "-0.02em" }}>
          Art That Celebrates What Makes Cities Distinct
        </Title>
        <Title order={2} ta="center" fw={400} c="dimmed" size="lg">
          Cassandra Wilcox, Pittsburgh-based Sketch Artist
        </Title>
        <Text ta="center" size="sm" style={{ lineHeight: 1.7, maxWidth: 640 }}>
          Cassandra Wilcox is an artist drawn to the things that make a place
          feel like itself (e.g. the Heinz ketchup bottle on the diner table,
          the can of IC Light, a Kennywood dog, the storefront that's been there
          for decades). Her work is place-first. Pittsburgh is home base, but
          wherever she is, she looks for the artifacts and landmarks that locals
          recognize in their bones and visitors carry home in their hearts. She
          sells original prints and takes custom commissions through her website
          at{" "}
          <Anchor href="https://cassandrawilcoxart.com" target="_blank" c="dark">
            cassandrawilcoxart.com
          </Anchor>{" "}
          and Etsy shop at{" "}
          <Anchor href="https://casswilcoxart.etsy.com" target="_blank" c="dark">
            casswilcoxart.etsy.com
          </Anchor>
          , and shows her work at local markets around Pittsburgh. You can
          follow her on Instagram at{" "}
          <Anchor
            href="https://instagram.com/cassie_or_cassandra"
            target="_blank"
            c="dark"
          >
            @cassie_or_cassandra
          </Anchor>
          .
        </Text>
      </Stack>

      <Divider mb="xl" />

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
