import { Container, Title, Text } from "@mantine/core";

export function Home() {
  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="md">
        Gallery
      </Title>
      <Text c="dimmed">Artwork grid coming soon.</Text>
    </Container>
  );
}
