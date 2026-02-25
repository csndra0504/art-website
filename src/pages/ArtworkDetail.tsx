import { Container, Title, Text } from "@mantine/core";
import { useParams } from "react-router-dom";

export function ArtworkDetail() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="md">
        {slug}
      </Title>
      <Text c="dimmed">Artwork detail page coming soon.</Text>
    </Container>
  );
}
