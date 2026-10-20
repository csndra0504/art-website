import { useEffect, useMemo, useState } from "react";
import { usePostHog } from "@posthog/react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Card,
  Container,
  Divider,
  Group,
  Image,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useLoaderData } from "react-router-dom";
import { PortableText } from "@portabletext/react";
import { getEvents } from "../lib/queries";
import { urlFor } from "../lib/sanity";
import { SeoHead } from "../components/SeoHead";
import { JsonLd } from "../components/JsonLd";
import { buildEventsJsonLd } from "../lib/structuredData";
import type { Event } from "../types/event";

type Filter = "all" | "upcoming" | "past";

// Runs at build time (and on client navigation) so the events list is baked
// into the static HTML for crawlers.
export async function loader() {
  return { events: await getEvents() };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function Events() {
  // Seed from the build-time loader (present in static HTML), then refetch on
  // the client so newly added or edited events show without a rebuild.
  // Loader data is null for any path the build didn't prerender, so read it
  // defensively — a stale manifest must not blank the page.
  const loaderData = useLoaderData() as { events: Event[] } | null;
  const [events, setEvents] = useState<Event[]>(loaderData?.events ?? []);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(() => {});
  }, []);

  const now = useMemo(() => new Date().toISOString(), []);

  const eventsJsonLd = useMemo(() => buildEventsJsonLd(events), [events]);

  // Soonest first for upcoming, most recent first for past.
  const upcoming = useMemo(
    () =>
      events
        .filter((e) => e.date >= now)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events, now],
  );
  const past = useMemo(
    () =>
      events
        .filter((e) => e.date < now)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [events, now],
  );

  const sections = [
    { key: "upcoming", label: "Upcoming", items: upcoming },
    { key: "past", label: "Past", items: past },
  ].filter((s) => (filter === "all" || filter === s.key) && s.items.length > 0);

  return (
    <Container size="lg" py="xl">
      <SeoHead
        title="Events | Cassandra Wilcox Art"
        description="Where to find Cassandra Wilcox in person: markets, shows, and gallery events around Pittsburgh."
        path="/events"
      />
      {eventsJsonLd && <JsonLd data={eventsJsonLd} />}
      <Stack gap="xl">
        <Title order={1} fw={700} style={{ letterSpacing: "-0.02em" }}>
          Events
        </Title>

        <Divider />

        <Group gap="xs">
          {(["all", "upcoming", "past"] as Filter[]).map((f) => (
            <Badge
              key={f}
              variant={filter === f ? "filled" : "outline"}
              color="dark"
              radius={0}
              size="md"
              style={{ cursor: "pointer", textTransform: "capitalize" }}
              onClick={() => setFilter(f)}
            >
              {f}
            </Badge>
          ))}
        </Group>

        {sections.length === 0 ? (
          <Text c="dimmed">No {filter === "all" ? "" : filter + " "}events.</Text>
        ) : (
          <Stack gap={48}>
            {sections.map((section) => (
              <Stack key={section.key} gap="lg">
                {/* Headings only when both groups are on screen; a filtered
                    view is already labelled by the active chip. */}
                {filter === "all" && (
                  <Group gap="sm" align="baseline">
                    <Title order={2} size="h4" fw={700} tt="uppercase" style={{ letterSpacing: "0.08em" }}>
                      {section.label}
                    </Title>
                    <Text size="sm" c="dimmed">
                      {section.items.length}
                    </Text>
                  </Group>
                )}
                {section.items.map((event) => (
                  <EventCard
                    key={event._id}
                    event={event}
                    isPast={section.key === "past"}
                  />
                ))}
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

function EventCard({ event, isPast }: { event: Event; isPast: boolean }) {
  const posthog = usePostHog();
  const photos = event.photos ?? [];
  const hasPhotos = photos.length > 0;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = () => setOpenIndex(null);
  const showPrev = () =>
    setOpenIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
  const showNext = () =>
    setOpenIndex((i) => (i === null ? i : (i + 1) % photos.length));

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") showPrev();
      else if (e.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, photos.length]);

  const activePhoto = openIndex === null ? null : photos[openIndex];

  return (
    <Card
      withBorder
      radius={0}
      shadow="sm"
      style={{
        borderColor: "#e8e8e0",
        // Upcoming gets a dark accent edge; past cards sit flat on the muted fill.
        borderLeft: isPast ? "1px solid #e8e8e0" : "4px solid var(--mantine-color-dark-9)",
        background: isPast ? "#fafaf8" : undefined,
      }}
      p="xl"
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={6}>
            <Group gap="sm" align="center">
              <Text
                fw={700}
                size="lg"
                tt="uppercase"
                c={isPast ? "dimmed" : "dark"}
                style={{ letterSpacing: "0.04em" }}
              >
                {formatDate(event.date)}
              </Text>
              <Badge
                variant={isPast ? "light" : "filled"}
                color={isPast ? "gray" : "dark"}
                radius={0}
                size="sm"
              >
                {isPast ? "Past" : "Upcoming"}
              </Badge>
            </Group>
            <Title order={3} fw={600} c={isPast ? "dimmed" : undefined}>
              {event.title}
            </Title>
          </Stack>
          {event.link && (
            <Anchor
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              c="dark"
              size="sm"
              onClick={() => posthog?.capture('event_link_clicked', { event_title: event.title, event_date: event.date })}
            >
              Event page →
            </Anchor>
          )}
        </Group>

        {event.description && event.description.length > 0 && (
          <Text size="sm" component="div" style={{ lineHeight: 1.7 }}>
            <PortableText value={event.description} />
          </Text>
        )}

        {hasPhotos && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "var(--mantine-spacing-sm)",
            }}
          >
            {photos.map((photo, idx) => (
              <Image
                key={photo._key}
                src={urlFor(photo.asset).width(600).height(450).fit("crop").url()}
                alt={photo.alt ?? event.title}
                radius={0}
                style={{
                  width: "100%",
                  aspectRatio: "4 / 3",
                  objectFit: "cover",
                  cursor: "zoom-in",
                }}
                onClick={() => setOpenIndex(idx)}
              />
            ))}
          </div>
        )}
      </Stack>

      <Modal
        opened={openIndex !== null}
        onClose={close}
        size="auto"
        centered
        padding={0}
        withCloseButton={false}
        radius={0}
        overlayProps={{ backgroundOpacity: 0.85, blur: 2 }}
        styles={{ content: { background: "transparent", boxShadow: "none" } }}
      >
        {activePhoto && (
          <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            <Image
              src={urlFor(activePhoto.asset).width(1600).fit("max").url()}
              alt={activePhoto.alt ?? event.title}
              fit="contain"
              radius={0}
              style={{ maxHeight: "85vh", maxWidth: "90vw", cursor: "zoom-out" }}
              onClick={close}
            />

            {photos.length > 1 && (
              <>
                <ActionIcon
                  variant="filled"
                  color="dark"
                  radius="xl"
                  size="lg"
                  onClick={showPrev}
                  aria-label="Previous photo"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                >
                  ‹
                </ActionIcon>
                <ActionIcon
                  variant="filled"
                  color="dark"
                  radius="xl"
                  size="lg"
                  onClick={showNext}
                  aria-label="Next photo"
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                >
                  ›
                </ActionIcon>
              </>
            )}

            <ActionIcon
              variant="filled"
              color="dark"
              radius="xl"
              size="lg"
              onClick={close}
              aria-label="Close"
              style={{ position: "absolute", top: 12, right: 12 }}
            >
              ×
            </ActionIcon>
          </div>
        )}
      </Modal>
    </Card>
  );
}

export const Component = Events;
