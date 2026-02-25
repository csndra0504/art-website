import { useEffect, useState } from "react";
import {
  Anchor,
  Badge,
  Button,
  Container,
  Divider,
  Grid,
  Group,
  Image,
  Loader,
  Center,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useParams, Link } from "react-router-dom";
import { PortableText } from "@portabletext/react";
import { getArtworkBySlug } from "../lib/queries";
import { urlFor } from "../lib/sanity";
import type { Artwork } from "../types/artwork";

export function ArtworkDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getArtworkBySlug(slug)
      .then(setArtwork)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

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
        <Text c="red">Failed to load artwork: {error}</Text>
      </Container>
    );
  }

  if (!artwork) {
    return (
      <Container size="lg" py="xl">
        <Text c="dimmed">Artwork not found.</Text>
        <Anchor component={Link} to="/" size="sm" mt="sm">
          Back to gallery
        </Anchor>
      </Container>
    );
  }

  const meta = [artwork.medium, artwork.dimensions, artwork.year]
    .filter(Boolean)
    .join(" · ");

  return (
    <Container size="lg" py="xl">
      <Anchor component={Link} to="/" size="sm" c="dimmed" mb="lg" display="block">
        &larr; Back to gallery
      </Anchor>

      <Grid gutter="xl">
        {/* Images column */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="md">
            {artwork.images.map((img, i) => (
              <Image
                key={img._key ?? i}
                src={urlFor(img.asset).width(1200).auto("format").url()}
                alt={img.alt ?? artwork.title}
                radius={0}
                style={{ width: "100%" }}
              />
            ))}
          </Stack>
        </Grid.Col>

        {/* Sticky sidebar */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <div
            style={{
              position: "sticky",
              top: 80,
              alignSelf: "start",
            }}
          >
            <Stack gap="md">
              <Title order={2}>{artwork.title}</Title>

              {meta && (
                <Text size="sm" c="dimmed">
                  {meta}
                </Text>
              )}

              <Divider color="#e8e8e0" />

              {artwork.description && (
                <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                  <PortableText value={artwork.description} />
                </div>
              )}

              {artwork.forSale && (
                <>
                  <Divider color="#e8e8e0" />
                  <Group gap="sm" align="center">
                    {artwork.price != null && (
                      <Text fw={600} size="lg">
                        ${artwork.price.toLocaleString()}
                      </Text>
                    )}
                    {artwork.purchaseUrl && (
                      <Button
                        component="a"
                        href={artwork.purchaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="filled"
                        color="dark"
                        radius={0}
                        size="sm"
                      >
                        Purchase
                      </Button>
                    )}
                  </Group>
                </>
              )}

              {artwork.tags && artwork.tags.length > 0 && (
                <>
                  <Divider color="#e8e8e0" />
                  <Group gap="xs">
                    {artwork.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        color="dark"
                        radius={0}
                        size="sm"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                </>
              )}
            </Stack>
          </div>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
