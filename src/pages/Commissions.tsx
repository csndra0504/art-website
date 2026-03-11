import { useEffect, useState } from "react";
import {
  Badge,
  Card,
  Center,
  Container,
  Divider,
  Group,
  Image,
  List,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { PortableText } from "@portabletext/react";
import { getCommissionsPage } from "../lib/queries";
import { urlFor } from "../lib/sanity";
import type { CommissionsPage } from "../types/commission";

const CONTACT_EMAIL = "csndra0504@gmail.com";

export function Commissions() {
  const [page, setPage] = useState<CommissionsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCommissionsPage()
      .then(setPage)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Center h={300}>
        <Loader color="gray" />
      </Center>
    );
  }

  if (error) {
    return (
      <Center h={300}>
        <Text c="red">{error}</Text>
      </Center>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        {/* Hero: title + intro left, image right */}
        <Group align="flex-start" gap="xl" wrap="wrap">
          <Stack gap="xs" style={{ flex: 1, minWidth: 220 }}>
            <Title order={1}>Commissions</Title>
            {page?.intro && (
              <Text component="div">
                <PortableText value={page.intro} />
              </Text>
            )}
          </Stack>

          {page?.featuredImage && (
            <Image
              src={urlFor(page.featuredImage.asset).width(500).url()}
              alt={page.featuredImage.alt ?? "Commission example"}
              radius="sm"
              style={{ width: "auto", maxWidth: 340, flexShrink: 0 }}
            />
          )}
        </Group>

        {/* Pricing */}
        {page?.pricingTiers && page.pricingTiers.length > 0 && (
          <Stack gap="sm">
            <Title order={3}>Pricing</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              {page.pricingTiers.map((tier) => (
                <Card key={tier._key} withBorder radius="sm" p="md">
                  <Group justify="space-between" mb={4}>
                    <Text fw={600}>{tier.label}</Text>
                    <Badge color="dark" variant="light" size="lg">
                      {tier.price}
                    </Badge>
                  </Group>
                  {tier.description && (
                    <Text size="sm" c="dimmed">
                      {tier.description}
                    </Text>
                  )}
                </Card>
              ))}
            </SimpleGrid>

            {(page.framingNote || page.largerFormatNote) && (
              <Stack gap={4} mt="xs">
                {page.framingNote && (
                  <Text size="sm" c="dimmed">
                    🖼 {page.framingNote}
                  </Text>
                )}
                {page.largerFormatNote && (
                  <Text size="sm" c="dimmed">
                    📐 {page.largerFormatNote}
                  </Text>
                )}
              </Stack>
            )}
          </Stack>
        )}

        <Divider />

        {/* How to request */}
        <Stack gap="sm">
          <Title order={3}>Request a Commission</Title>
          <Text>Send me an email with the following details:</Text>
          <List spacing="xs">
            <List.Item>Whether you'd like an <strong>on-location</strong> session or a painting <strong>from a photo</strong></List.Item>
            <List.Item>If on-location, the <strong>address</strong> of the location</List.Item>
            <List.Item>Your preferred <strong>size or format</strong> (e.g. A4, 4×6 — happy to discuss larger)</List.Item>
            <List.Item>Whether you're interested in <strong>framing</strong> (available at an additional cost)</List.Item>
            <List.Item>A <strong>description</strong> of what you'd like painted — subject, mood, any references</List.Item>
          </List>
          <Text>
            Send your email to <strong>{CONTACT_EMAIL}</strong>
          </Text>
        </Stack>
      </Stack>
    </Container>
  );
}
