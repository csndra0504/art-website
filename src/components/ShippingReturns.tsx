import { Box, List, Text } from "@mantine/core";
import { SHIPPING_RETURNS } from "../lib/siteContent";

// Compact trust block for the product page: shipping, packaging, and the
// damaged-in-transit guarantee. Reassurance at the moment of decision is the
// biggest lever on converting a first-time buyer of an original.
export function ShippingReturns() {
  if (SHIPPING_RETURNS.length === 0) return null;

  return (
    <Box p="md" style={{ border: "1px solid #e8e8e0", background: "#fafaf8" }}>
      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
        Shipping &amp; Returns
      </Text>
      <List spacing={6} size="sm" listStyleType="none" style={{ lineHeight: 1.6 }}>
        {SHIPPING_RETURNS.map((line) => (
          <List.Item key={line}>{line}</List.Item>
        ))}
      </List>
    </Box>
  );
}
