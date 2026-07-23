import { useEffect, useState } from "react";
import { Anchor, CloseButton, Container, Group, Text } from "@mantine/core";
import { Link } from "react-router-dom";
import { getUpcomingEvents } from "../lib/queries";
import type { Event } from "../types/event";

const DISMISSED_KEY = "event-banner-dismissed";
const SHOW_WITHIN_DAYS = 30;

function isWithinWindow(event: Event): boolean {
  const now = new Date();
  const eventDate = new Date(event.date);
  const daysUntil =
    (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntil <= SHOW_WITHIN_DAYS;
}

export function EventBanner() {
  const [event, setEvent] = useState<Event | null>(null);
  // Start undismissed on the server and first client render (sessionStorage is
  // browser-only), then reconcile from storage after mount to avoid a hydration
  // mismatch.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Reconcile dismissal from storage after mount (SSR-safe). The one extra
    // render is intentional and cheap — it only hides an already-dismissed banner.
    if (sessionStorage.getItem(DISMISSED_KEY) === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (dismissed) return;
    getUpcomingEvents()
      .then((events) => {
        const eligible = events.find(isWithinWindow);
        if (eligible) setEvent(eligible);
      })
      .catch(() => {});
  }, [dismissed]);

  if (dismissed || !event) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  return (
    <div
      style={{
        backgroundColor: "#f5f0e8",
        borderBottom: "1px solid #e8e0d0",
        margin: "calc(var(--mantine-spacing-md) * -1)",
        marginBottom: 0,
      }}
    >
      <Container size="lg" py={10}>
        <Group justify="space-between" wrap="nowrap" gap="sm">
          <Text size="sm" style={{ lineHeight: 1.5 }}>
            See my work in person &mdash; {event.title}.{" "}
            <Anchor component={Link} to="/events" c="dark" fw={600}>
              View details &rarr;
            </Anchor>
          </Text>
          <CloseButton
            size="sm"
            aria-label="Dismiss banner"
            onClick={handleDismiss}
          />
        </Group>
      </Container>
    </div>
  );
}
