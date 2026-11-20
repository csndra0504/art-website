import { useEffect, useState } from "react";
import { Anchor, CloseButton, Container, Group, Text } from "@mantine/core";
import { Link } from "react-router-dom";
import { dismissForAWeek, HOLIDAY_BANNER_KEY, isDismissed } from "../lib/bannerDismissal";
import { joinDates, useHolidayShipping } from "../lib/holiday";
import { getUpcomingEvents } from "../lib/queries";
import type { Event } from "../types/event";

// "Venue" is whatever follows " - " in an event title ("Handmade Arcade Holiday
// Market - David L. Lawrence Convention Center"); the banner wants just the name.
const shortTitle = (title: string) => title.split(" - ")[0];

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// The one banner during the holiday window: the Christmas-delivery cutoff plus
// the next market. It replaces the separate event banner (which hides itself
// while this is active) so the header stays a single bar.
// Renders nothing until mounted (the date and dismissal are both browser-only),
// and after Dec 24 the hook returns null so it retires itself.
export function HolidayBanner() {
  const holiday = useHolidayShipping();
  const [dismissed, setDismissed] = useState(false);
  const [nextEvent, setNextEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (isDismissed(HOLIDAY_BANNER_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    getUpcomingEvents()
      .then((events) => setNextEvent(events[0] ?? null))
      .catch(() => {});
  }, []);

  if (!holiday || dismissed) return null;

  return (
    <div style={{ backgroundColor: "#1a1b1e", color: "#fff" }}>
      <Container size="lg" py={8}>
        <Group justify="space-between" wrap="nowrap" gap="sm">
          <Text size="sm" style={{ lineHeight: 1.5 }}>
            {holiday.headline}
            {/* Past the cutoff the market dates are the offer, so list them all;
                before it, the next one is enough to point at the Events page. */}
            {holiday.pastCutoff && holiday.pickup.length > 0 ? (
              <> Pickup at a market: {joinDates(holiday.pickup)}.</>
            ) : (
              nextEvent && (
                <>
                  {" "}
                  Next market: {shortTitle(nextEvent.title)} ({shortDate(nextEvent.date)}).
                </>
              )
            )}{" "}
            <Anchor component={Link} to="/events" c="white" fw={600} underline="always">
              Market dates
            </Anchor>
          </Text>
          <CloseButton
            size="sm"
            c="white"
            aria-label="Dismiss banner"
            onClick={() => {
              dismissForAWeek(HOLIDAY_BANNER_KEY);
              setDismissed(true);
            }}
          />
        </Group>
      </Container>
    </div>
  );
}
