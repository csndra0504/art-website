import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Drawer,
  Group,
  Image,
  Stack,
  Text,
} from "@mantine/core";
import { lineId, type CartLine } from "../lib/cart";
import { useCart } from "../lib/cartContext";
import { ShippingReturns } from "./ShippingReturns";

function QtyStepper({
  line,
  onChange,
}: {
  line: CartLine;
  onChange: (qty: number) => void;
}) {
  // One-of-a-kind pieces can't go past 1, so a stepper would be a control that
  // does nothing. Show the count as plain text instead.
  if (line.oneOfAKind) {
    return (
      <Text size="sm" c="dimmed">
        1 only
      </Text>
    );
  }

  return (
    <Group gap={4} wrap="nowrap">
      <ActionIcon
        variant="default"
        radius={0}
        size="sm"
        aria-label={`Decrease quantity of ${line.optionTitle}`}
        onClick={() => onChange(line.qty - 1)}
      >
        &minus;
      </ActionIcon>
      <Text size="sm" w={20} ta="center">
        {line.qty}
      </Text>
      <ActionIcon
        variant="default"
        radius={0}
        size="sm"
        aria-label={`Increase quantity of ${line.optionTitle}`}
        onClick={() => onChange(line.qty + 1)}
      >
        +
      </ActionIcon>
    </Group>
  );
}

function CartLineRow({ line }: { line: CartLine }) {
  const { remove, setLineQty } = useCart();
  const id = lineId(line);

  return (
    <Box p="md" style={{ border: "1px solid #e8e8e0", background: "#fff" }}>
      <Group gap="md" wrap="nowrap" align="flex-start">
        {line.image && (
          <Image
            src={line.image}
            alt={line.title}
            w={64}
            h={64}
            fit="contain"
            radius={0}
            style={{ background: "#f5f5f0", flexShrink: 0 }}
          />
        )}
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={600} lineClamp={2}>
            {line.title}
          </Text>
          <Text size="xs" c="dimmed">
            {line.optionTitle}
          </Text>
          <Group justify="space-between" align="center" wrap="nowrap" mt={4}>
            <QtyStepper line={line} onChange={(qty) => setLineQty(id, qty)} />
            <Text size="sm" fw={600}>
              ${(line.price * line.qty).toLocaleString()}
            </Text>
          </Group>
        </Stack>
      </Group>
      <Group justify="flex-end" mt="xs">
        <Text
          size="xs"
          c="dimmed"
          role="button"
          tabIndex={0}
          onClick={() => remove(id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") remove(id);
          }}
          style={{ cursor: "pointer", textDecoration: "underline" }}
        >
          Remove
        </Text>
      </Group>
    </Box>
  );
}

export function CartDrawer({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const { lines, total, count } = useCart();

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={
        <Text fw={600}>
          Cart{count > 0 ? ` (${count})` : ""}
        </Text>
      }
      styles={{ content: { background: "#FAFAF8" } }}
    >
      {lines.length === 0 ? (
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            Your cart is empty.
          </Text>
          <Text
            size="sm"
            role="button"
            tabIndex={0}
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onClose();
            }}
            style={{ cursor: "pointer", textDecoration: "underline" }}
          >
            Keep browsing
          </Text>
        </Stack>
      ) : (
        <Stack gap="md">
          <Stack gap="sm">
            {lines.map((line) => (
              <CartLineRow key={lineId(line)} line={line} />
            ))}
          </Stack>

          <Divider color="#e8e8e0" />

          <Group justify="space-between" align="baseline">
            <Text size="sm" fw={600}>
              Subtotal
            </Text>
            <Text size="lg" fw={600}>
              ${total.toLocaleString()}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            Shipping calculated at checkout.
          </Text>

          {/* Policy sits above the button on purpose: a buyer should meet the
              all-sales-final terms before committing, not after. */}
          <ShippingReturns />

          {/* Wired to the checkout service in Phase 2 (CAS-41). */}
          <Button variant="filled" color="dark" radius={0} size="md" disabled>
            Checkout
          </Button>
        </Stack>
      )}
    </Drawer>
  );
}
