import { Box, Image, SimpleGrid, Stack, Text } from "@mantine/core";

export interface CommissionExample {
  /** Path under /public, e.g. "/images/commissions/didi-home.jpg". */
  src: string;
  /** Descriptive alt text for accessibility. */
  alt: string;
  /** Short caption shown under the image. */
  caption: string;
}

// Real past commissions, shown to convey range and quality. Not linked out — the
// page's one job is to keep the visitor moving toward the form.
export function CommissionGallery({ examples }: { examples: CommissionExample[] }) {
  if (examples.length === 0) return null;

  return (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="lg">
      {examples.map((ex) => (
        <Stack key={ex.src} gap={6}>
          <Image
            src={ex.src}
            alt={ex.alt}
            loading="lazy"
            radius="sm"
            style={{
              aspectRatio: "1 / 1",
              objectFit: "cover",
              objectPosition: "center",
              boxShadow: "var(--mantine-shadow-sm)",
            }}
          />
          <Box>
            <Text size="sm" c="dimmed">
              {ex.caption}
            </Text>
          </Box>
        </Stack>
      ))}
    </SimpleGrid>
  );
}
