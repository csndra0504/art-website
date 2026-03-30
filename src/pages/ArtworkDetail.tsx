import { useEffect, useState } from "react";
import {
  Anchor,
  Badge,
  Box,
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

const VENMO_HANDLE = "cassandrawilcox";

function venmoUrl(amount: number, note: string) {
  return `https://venmo.com/${VENMO_HANDLE}?txn=pay&amount=${amount}&note=${encodeURIComponent(note)}`;
}

function PurchaseOptions({ artwork }: { artwork: Artwork }) {
  const hasOriginal = artwork.originalPrice != null;
  const hasEtsy = !!artwork.printEtsyUrl;
  const hasLocalPrint = artwork.printLocalPrice != null;

  if (!hasOriginal && !hasEtsy && !hasLocalPrint) return null;

  return (
    <Stack gap="sm">
      {hasOriginal && (
        <Box
          p="md"
          style={{
            border: "1px solid #e8e8e0",
            background: artwork.originalSold ? "#fafaf8" : "#fff",
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap" gap="xs">
            <div>
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={2}>
                Original
              </Text>
              <Group gap="xs" align="center">
                <Text
                  fw={600}
                  size="lg"
                  td={artwork.originalSold ? "line-through" : undefined}
                  c={artwork.originalSold ? "dimmed" : undefined}
                >
                  ${artwork.originalPrice!.toLocaleString()}
                </Text>
                {artwork.originalSold && (
                  <Badge color="red" variant="filled" size="sm" radius={0}>
                    Sold
                  </Badge>
                )}
              </Group>
            </div>
            {!artwork.originalSold && (
              <Button
                component="a"
                href={venmoUrl(
                  artwork.originalPrice!,
                  `Original — ${artwork.title}`
                )}
                target="_blank"
                rel="noopener noreferrer"
                variant="filled"
                color="dark"
                radius={0}
                size="sm"
              >
                Buy via Venmo
              </Button>
            )}
          </Group>
          {!artwork.originalSold && (
            <Text size="xs" c="dimmed" mt="xs">
              Pickup on or about May 1 after show concludes
            </Text>
          )}
        </Box>
      )}

      {hasEtsy && (
        <Box p="md" style={{ border: "1px solid #e8e8e0" }}>
          <Group justify="space-between" align="center" wrap="wrap" gap="xs">
            <div>
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={2}>
                Print
              </Text>
              {artwork.printEtsyPrice != null ? (
                <Text fw={600} size="lg">
                  ${artwork.printEtsyPrice.toLocaleString()}
                </Text>
              ) : (
                <Text size="sm">Available on Etsy</Text>
              )}
            </div>
            <Button
              component="a"
              href={artwork.printEtsyUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              color="dark"
              radius={0}
              size="sm"
            >
              Order Print
            </Button>
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            Ships via Etsy
          </Text>
        </Box>
      )}

      {hasLocalPrint && (
        <Box
          p="md"
          style={{
            border: "1px solid #e8e8e0",
            background: artwork.printLocalSold ? "#fafaf8" : "#fff",
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap" gap="xs">
            <div>
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={2}>
                Print — Local Pickup
              </Text>
              <Group gap="xs" align="center">
                <Text
                  fw={600}
                  size="lg"
                  td={artwork.printLocalSold ? "line-through" : undefined}
                  c={artwork.printLocalSold ? "dimmed" : undefined}
                >
                  ${artwork.printLocalPrice!.toLocaleString()}
                </Text>
                {artwork.printLocalSold && (
                  <Badge color="red" variant="filled" size="sm" radius={0}>
                    Sold
                  </Badge>
                )}
              </Group>
            </div>
            {!artwork.printLocalSold && (
              <Button
                component="a"
                href={venmoUrl(
                  artwork.printLocalPrice!,
                  `Print — ${artwork.title}`
                )}
                target="_blank"
                rel="noopener noreferrer"
                variant="filled"
                color="dark"
                radius={0}
                size="sm"
              >
                Buy via Venmo
              </Button>
            )}
          </Group>
          {!artwork.printLocalSold && (
            <Text size="xs" c="dimmed" mt="xs">
              Arrange pickup via email or DM
            </Text>
          )}
        </Box>
      )}
    </Stack>
  );
}

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

  const infoContent = (
    <Stack gap="md">
      <Title order={2}>{artwork.title}</Title>

      {meta && (
        <Text size="sm" c="dimmed">
          {meta}
        </Text>
      )}

      {artwork.forSale && (
        <>
          <Divider color="#e8e8e0" />
          <PurchaseOptions artwork={artwork} />
        </>
      )}

      <Divider color="#e8e8e0" />

      {artwork.description && (
        <div style={{ fontSize: 14, lineHeight: 1.7 }}>
          <PortableText value={artwork.description} />
        </div>
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
  );

  return (
    <Container size="lg" py="xl">
      <Anchor
        component={Link}
        to="/"
        size="sm"
        c="dimmed"
        mb="lg"
        display="block"
      >
        &larr; Back to gallery
      </Anchor>

      {/* Mobile layout: thumbnail → info → full images */}
      <Box hiddenFrom="md">
        <Stack gap="lg">
          {artwork.images[0] && (
            <Image
              src={urlFor(artwork.images[0].asset)
                .width(600)
                .auto("format")
                .url()}
              alt={artwork.images[0].alt ?? artwork.title}
              radius={0}
              h={200}
              fit="contain"
              style={{ background: "#f5f5f0" }}
            />
          )}

          {infoContent}

          {artwork.images.length > 0 && (
            <>
              <Divider color="#e8e8e0" />
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
            </>
          )}
        </Stack>
      </Box>

      {/* Desktop layout: images left, sticky sidebar right */}
      <Grid gutter="xl" visibleFrom="md">
        <Grid.Col span={7}>
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

        <Grid.Col span={5}>
          <div style={{ position: "sticky", top: 80, alignSelf: "start" }}>
            {infoContent}
          </div>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
