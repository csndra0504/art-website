import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Drawer,
  Group,
  Image,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { lineId, type CartLine } from "../lib/cart";
import { useCart } from "../lib/cartContext";
import {
  MissingShippingTypeError,
  shippingCents,
  type FulfillmentMethod,
} from "../lib/shipping";
import { BUNDLE, bundleDiscountCents } from "../lib/discounts";
import { ShippingReturns } from "./ShippingReturns";
import { trackCartCheckout } from "../lib/analytics";
import { PENDING_ORDER_KEY } from "../lib/cart";

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

function CartLineRow({ line, problem }: { line: CartLine; problem?: string }) {
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
          {problem && (
            <Text size="xs" c="red.8" fw={500}>
              {problem} — please remove to continue
            </Text>
          )}
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

type CheckoutState =
  | { status: "idle" }
  | { status: "working" }
  | { status: "error"; message: string; lines: Record<string, string>; forCart: string };

export function CartDrawer({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const { lines, total, count } = useCart();
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>("ship");
  const [lastCheckout, setCheckout] = useState<CheckoutState>({ status: "idle" });

  // An error describes the cart as it was when checkout was tried. Once the
  // cart or the ship/pickup choice changes, it no longer applies, so it's
  // ignored rather than reset — no effect, no extra render.
  const cartKey = `${fulfillment}|${lines.map((l) => `${l.productId}×${l.qty}`).join(",")}`;
  const checkout: CheckoutState =
    lastCheckout.status === "error" && lastCheckout.forCart !== cartKey
      ? { status: "idle" }
      : lastCheckout;

  // Preview only: the server recomputes shipping from its own read of each
  // product. If a line doesn't know its band (saved before bands existed, or a
  // product without one), say "calculated at checkout" rather than guess.
  const shipping = useMemo(() => {
    try {
      return shippingCents(
        lines.map((l) => ({ shippingType: l.shippingType, qty: l.qty })),
        fulfillment
      );
    } catch (err) {
      if (err instanceof MissingShippingTypeError) return null;
      throw err;
    }
  }, [lines, fulfillment]);

  // Preview too; the server applies the same rule to the Square order.
  const discount = useMemo(
    () =>
      bundleDiscountCents(
        lines.map((l) => ({
          shippingType: l.shippingType,
          qty: l.qty,
          unitCents: Math.round(l.price * 100),
        }))
      ),
    [lines]
  );
  const itemsCents = total * 100 - discount;

  const startCheckout = async () => {
    setCheckout({ status: "working" });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillment,
          items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        orderId?: string;
        error?: string;
        lines?: { productId: string; reason: string }[];
      };
      if (res.ok && body.url) {
        trackCartCheckout(
          lines.map((l) => ({
            item_id: l.slug,
            item_name: l.title,
            item_variant: l.optionTitle,
            price: l.price,
            quantity: l.qty,
          })),
          (itemsCents + (shipping ?? 0)) / 100,
          fulfillment
        );
        // The success page is told its order id in the URL, but remembers it
        // here too, per tab, in case that ever goes missing on the way back.
        try {
          if (body.orderId) sessionStorage.setItem(PENDING_ORDER_KEY, body.orderId);
        } catch {
          // Storage blocked; the URL still carries the id.
        }
        // Hand over to Square's hosted page. The cart stays saved, so backing
        // out of payment returns to it intact.
        window.location.assign(body.url);
        return;
      }
      setCheckout({
        status: "error",
        message: body.error ?? "Checkout is unavailable right now.",
        lines: Object.fromEntries((body.lines ?? []).map((l) => [l.productId, l.reason])),
        forCart: cartKey,
      });
    } catch {
      setCheckout({
        status: "error",
        message: "Couldn't reach checkout. Check your connection and try again.",
        lines: {},
        forCart: cartKey,
      });
    }
  };

  const problems = checkout.status === "error" ? checkout.lines : {};
  const blocked = Object.keys(problems).some((id) => lines.some((l) => l.productId === id));

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
              <CartLineRow
                key={lineId(line)}
                line={line}
                problem={problems[line.productId]}
              />
            ))}
          </Stack>

          <Divider color="#e8e8e0" />

          {/* Square's hosted page takes one shipping fee and can't offer a
              choice, so ship-or-pickup is decided here, before handing over. */}
          <SegmentedControl
            value={fulfillment}
            onChange={(v) => setFulfillment(v as FulfillmentMethod)}
            data={[
              { label: "Ship to me", value: "ship" },
              { label: "Local pickup", value: "pickup" },
            ]}
            radius={0}
            fullWidth
          />

          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="sm">Subtotal</Text>
              <Text size="sm">{money(total * 100)}</Text>
            </Group>
            {discount > 0 && (
              <Group justify="space-between">
                <Text size="sm">{BUNDLE.name}</Text>
                <Text size="sm">−{money(discount)}</Text>
              </Group>
            )}
            <Group justify="space-between">
              <Text size="sm">
                {fulfillment === "pickup" ? "Local pickup, Pittsburgh" : "Shipping"}
              </Text>
              <Text size="sm">
                {fulfillment === "pickup"
                  ? "Free"
                  : shipping == null
                    ? "Calculated at checkout"
                    : money(shipping)}
              </Text>
            </Group>
            <Group justify="space-between" align="baseline" mt={4}>
              <Text size="sm" fw={600}>
                Total
              </Text>
              <Text size="lg" fw={600}>
                {shipping == null && fulfillment === "ship"
                  ? `${money(itemsCents)} + shipping`
                  : money(itemsCents + (shipping ?? 0))}
              </Text>
            </Group>
          </Stack>

          {/* Policy sits above the button on purpose: a buyer should meet the
              all-sales-final terms before committing, not after. */}
          <ShippingReturns />

          {checkout.status === "error" && (
            <Text size="sm" c="red.8" role="alert">
              {checkout.message}
              {!blocked && " Or email hello@cassandrawilcoxart.com and I'll sort it out."}
            </Text>
          )}

          <Button
            variant="filled"
            color="dark"
            radius={0}
            size="md"
            onClick={startCheckout}
            loading={checkout.status === "working"}
            disabled={blocked}
          >
            Checkout
          </Button>
        </Stack>
      )}
    </Drawer>
  );
}

function money(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: cents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}
