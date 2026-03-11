import { useEffect, useMemo, useState } from "react";
import {
  Anchor,
  Badge,
  Card,
  Center,
  Container,
  Divider,
  Group,
  Image,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { PortableText } from "@portabletext/react";
import { getEvents } from "../lib/queries";
import { urlFor } from "../lib/sanity";
import type { Event } from "../types/event";

type Filter = "all" | "upcoming" | "past";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const now = useMemo(() => new Date().toISOString(), []);

  const filtered = useMemo(() => {
    if (filter === "upcoming") {
      return events
        .filter((e) => e.date >= now)
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    if (filter === "past") {
      return events
        .filter((e) => e.date < now)
        .sort((a, b) => b.date.localeCompare(a.date));
    }
    // "all": upcoming first (asc), then past (desc)
    const upcoming = events
      .filter((e) => e.date >= now)
      .sort((a, b) => a.date.localeCompare(b.date));
    const past = events
      .filter((e) => e.date < now)
      .sort((a, b) => b.date.localeCompare(a.date));
    return [...upcoming, ...past];
  }, [events, filter, now]);

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
        <Text c="red">Failed to load events: {error}</Text>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
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

        {filtered.length === 0 ? (
          <Text c="dimmed">No {filter === "all" ? "" : filter + " "}events.</Text>
        ) : (
          <Stack gap="xl">
            {filtered.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

function EventCard({ event }: { event: Event }) {
  const hasPhotos = event.photos && event.photos.length > 0;

  return (
    <Card
      withBorder
      radius={0}
      shadow="sm"
      style={{ borderColor: "#e8e8e0" }}
      p="xl"
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <Title order={3} fw={600}>
              {event.title}
            </Title>
            <Text size="sm" c="dimmed">
              {formatDate(event.date)}
            </Text>
          </Stack>
          {event.link && (
            <Anchor href={event.link} target="_blank" rel="noopener noreferrer" c="dark" size="sm">
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
          <Group gap="sm" wrap="wrap">
            {event.photos!.map((photo) => (
              <Image
                key={photo._key}
                src={urlFor(photo.asset).width(400).height(300).fit("crop").url()}
                alt={photo.alt ?? event.title}
                w={200}
                h={150}
                radius={0}
                style={{ objectFit: "cover" }}
              />
            ))}
          </Group>
        )}
      </Stack>
    </Card>
  );
}
