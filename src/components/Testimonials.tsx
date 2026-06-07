import { Anchor, Box, Group, Stack, Text } from "@mantine/core";
import { ETSY_REVIEW_SUMMARY, TESTIMONIALS } from "../lib/siteContent";

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <Text component="span" c="brick.6" aria-label={`${full} out of 5 stars`}>
      {"★".repeat(full)}
      <Text component="span" c="dimmed">
        {"★".repeat(Math.max(0, 5 - full))}
      </Text>
    </Text>
  );
}

// Real customer quotes as social proof. Renders nothing while no testimonials
// (and no Etsy summary) are configured, so the page never shows an empty shell
// and nothing fabricated ever appears.
export function Testimonials({ heading = "What buyers say" }: { heading?: string }) {
  if (TESTIMONIALS.length === 0 && !ETSY_REVIEW_SUMMARY) return null;

  return (
    <Stack gap="md">
      <Group justify="space-between" align="baseline" wrap="wrap" gap="xs">
        <Text size="xs" tt="uppercase" fw={600} c="dimmed">
          {heading}
        </Text>
        {ETSY_REVIEW_SUMMARY && (
          <Text size="xs" c="dimmed">
            <Stars rating={ETSY_REVIEW_SUMMARY.rating} />{" "}
            {ETSY_REVIEW_SUMMARY.rating.toFixed(1)} from{" "}
            <Anchor
              href={ETSY_REVIEW_SUMMARY.url}
              target="_blank"
              rel="noopener noreferrer"
              c="dark"
            >
              {ETSY_REVIEW_SUMMARY.count} Etsy reviews
            </Anchor>
          </Text>
        )}
      </Group>

      {TESTIMONIALS.map((t) => (
        <Box
          key={t.attribution + t.quote.slice(0, 24)}
          p="md"
          style={{ border: "1px solid #e8e8e0", background: "#fff" }}
        >
          {t.rating != null && (
            <Box mb={6}>
              <Stars rating={t.rating} />
            </Box>
          )}
          <Text size="sm" style={{ lineHeight: 1.6 }}>
            &ldquo;{t.quote}&rdquo;
          </Text>
          <Text size="xs" c="dimmed" mt="xs" fw={600}>
            &mdash; {t.attribution}
          </Text>
        </Box>
      ))}
    </Stack>
  );
}
