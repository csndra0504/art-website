import { useEffect, useState } from "react";
import { Container, SimpleGrid, Text, Loader, Center } from "@mantine/core";
import { getArtworks } from "../lib/queries";
import { ArtworkCard } from "../components/ArtworkCard";
import type { ArtworkSummary } from "../types/artwork";

export function Home() {
  const [artworks, setArtworks] = useState<ArtworkSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getArtworks()
      .then(setArtworks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="lg">
        {artworks.map((artwork) => (
          <ArtworkCard key={artwork._id} artwork={artwork} />
        ))}
      </SimpleGrid>
    </Container>
  );
}
