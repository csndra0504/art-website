import { Box, List, Text } from "@mantine/core";
import { SHIPPING_RETURNS } from "../lib/siteContent";
import { joinDates, useHolidayShipping } from "../lib/holiday";

// Compact trust block for the product page: shipping, packaging, and the
// damaged-in-transit guarantee. Reassurance at the moment of decision is the
// biggest lever on converting a first-time buyer of an original.
export function ShippingReturns() {
  const holiday = useHolidayShipping();
  if (SHIPPING_RETURNS.length === 0 && !holiday) return null;

  return (
    <Box p="md" style={{ border: "1px solid #e8e8e0", background: "#fafaf8" }}>
      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
        Shipping &amp; Returns
      </Text>
      <List spacing={6} size="sm" listStyleType="none" style={{ lineHeight: 1.6 }}>
        {/* Seasonal, so it leads: a gift buyer's first question is "will it
            arrive in time?" */}
        {holiday && (
          <List.Item>
            <Text span fw={600} size="sm">
              {holiday.headline}
            </Text>
            {holiday.pickup.length > 0 && (
              <>
                {" "}
                {holiday.pastCutoff ? "Choose" : "Or choose"} free pickup at one of my markets:{" "}
                {joinDates(holiday.pickup)}.
              </>
            )}
          </List.Item>
        )}
        {SHIPPING_RETURNS.map((line) => (
          <List.Item key={line}>{line}</List.Item>
        ))}
      </List>
    </Box>
  );
}
