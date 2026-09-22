import { useEffect, useRef, useState } from "react";
import { Anchor, Box, Container, Divider, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { Link, useSearchParams } from "react-router-dom";
import { SeoHead } from "../components/SeoHead";
import { EmailSignup } from "../components/EmailSignup";
import { useCart } from "../lib/cartContext";
import { PENDING_ORDER_KEY, TRACKED_ORDERS_KEY } from "../lib/cart";
import { trackPurchase } from "../lib/analytics";
import { BUNDLE } from "../lib/discounts";

// Where Square returns a buyer after paying. Prerendered as an empty shell;
// everything real happens in the browser, because the order only exists once
// someone has checked out.
//
// Square appends nothing to the return URL (confirmed in the sandbox), so the
// API bakes the order id into it; the id the drawer saved in sessionStorage is
// the fallback. This page trusts neither for money: it asks the API whether the
// order is actually paid before thanking anyone or emptying their cart.

interface OrderSummary {
  orderId: string;
  paid: boolean;
  fulfillment: "ship" | "pickup";
  items: { name: string; quantity: number; totalCents: number }[];
  discountCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
}

type State =
  | { status: "loading" }
  | { status: "paid"; order: OrderSummary }
  | { status: "unpaid" }
  | { status: "missing" };

// Square can take a moment to attach the payment after redirecting. A few
// short retries cover that without leaving someone staring at a spinner.
const ATTEMPTS = 6;
const RETRY_MS = 1500;

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: cents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;

function pendingOrderId(): string | null {
  try {
    return sessionStorage.getItem(PENDING_ORDER_KEY);
  } catch {
    return null;
  }
}

/** Records the purchase unless this order already has been. */
function trackOnce(order: OrderSummary) {
  let tracked: string[] = [];
  try {
    tracked = JSON.parse(localStorage.getItem(TRACKED_ORDERS_KEY) ?? "[]");
  } catch {
    // Unreadable storage: track anyway. A paid order with no record is worse
    // than a possible duplicate.
  }
  if (tracked.includes(order.orderId)) return;
  trackPurchase({
    transactionId: order.orderId,
    value: order.totalCents / 100,
    shipping: order.shippingCents / 100,
    tax: order.taxCents / 100,
    fulfillment: order.fulfillment,
    items: order.items.map((i) => ({
      item_id: i.name,
      item_name: i.name,
      price: i.totalCents / 100 / i.quantity,
      quantity: i.quantity,
    })),
  });
  try {
    localStorage.setItem(TRACKED_ORDERS_KEY, JSON.stringify([...tracked, order.orderId].slice(-20)));
  } catch {
    // Storage blocked; the event has still been sent once for this visit.
  }
}

export function CheckoutSuccess() {
  const [params] = useSearchParams();
  const [state, setState] = useState<State>({ status: "loading" });
  const { clear, ready } = useCart();
  const cleared = useRef(false);

  useEffect(() => {
    // Read in the effect, not during render: sessionStorage doesn't exist while
    // prerendering, and reading it in render would make the static HTML and the
    // browser's first render disagree.
    const orderId = params.get("orderId") ?? pendingOrderId();
    let cancelled = false;
    (async () => {
      if (!orderId) {
        setState({ status: "missing" });
        return;
      }
      for (let attempt = 1; attempt <= ATTEMPTS && !cancelled; attempt++) {
        try {
          const res = await fetch(`/api/order/${encodeURIComponent(orderId)}`);
          if (res.status === 404 || res.status === 400) {
            if (!cancelled) setState({ status: "missing" });
            return;
          }
          if (res.ok) {
            const order = (await res.json()) as OrderSummary;
            if (order.paid) {
              if (!cancelled) setState({ status: "paid", order });
              return;
            }
          }
        } catch {
          // Network blip; retry below.
        }
        if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, RETRY_MS));
      }
      // Still unpaid (or unreachable) after retrying. Say so rather than thank
      // someone who may not have paid, and leave their cart alone.
      if (!cancelled) setState({ status: "unpaid" });
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  // Only a confirmed payment empties the cart — and only once the stored cart
  // has loaded, or loading it afterwards would put everything back.
  useEffect(() => {
    if (state.status !== "paid" || !ready || cleared.current) return;
    cleared.current = true;
    clear();
    try {
      sessionStorage.removeItem(PENDING_ORDER_KEY);
    } catch {
      // Nothing to clean up if storage is blocked.
    }
    trackOnce(state.order);
  }, [state, ready, clear]);

  return (
    <Container size="sm" py="xl">
      <SeoHead title="Order confirmation | Cassandra Wilcox Art" description="Order confirmation." noindex />

      {state.status === "loading" && (
        <Group gap="sm" py="xl">
          <Loader size="sm" color="dark" />
          <Text c="dimmed">Confirming your order…</Text>
        </Group>
      )}

      {state.status === "paid" && <Confirmation order={state.order} />}

      {state.status === "unpaid" && (
        <Stack gap="sm" py="lg">
          <Title order={2}>We couldn&rsquo;t confirm a payment yet</Title>
          <Text>
            If you completed payment, Square will email you a receipt, and your
            order is safe. If you didn&rsquo;t, your cart is still here whenever
            you&rsquo;re ready.
          </Text>
          <Text size="sm" c="dimmed">
            Not sure? Email hello@cassandrawilcoxart.com and I&rsquo;ll check.
          </Text>
          <Anchor component={Link} to="/" size="sm">
            Back to the gallery
          </Anchor>
        </Stack>
      )}

      {state.status === "missing" && (
        <Stack gap="sm" py="lg">
          <Title order={2}>Nothing to show here</Title>
          <Text>This page confirms an order after checkout, and there isn&rsquo;t one to show.</Text>
          <Anchor component={Link} to="/" size="sm">
            Back to the gallery
          </Anchor>
        </Stack>
      )}
    </Container>
  );
}

function Confirmation({ order }: { order: OrderSummary }) {
  const pickup = order.fulfillment === "pickup";
  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Title order={2}>Thank you!</Title>
        <Text>Your order is confirmed. Square has emailed you a receipt.</Text>
      </Stack>

      <Box p="md" style={{ border: "1px solid #e8e8e0", background: "#fff" }}>
        <Stack gap="xs">
          {order.items.map((item, i) => (
            <Group key={i} justify="space-between" wrap="nowrap" align="flex-start">
              <Text size="sm">
                {item.quantity > 1 ? `${item.quantity} × ` : ""}
                {item.name}
              </Text>
              <Text size="sm">{money(item.totalCents)}</Text>
            </Group>
          ))}
          <Divider color="#e8e8e0" />
          {order.discountCents > 0 && (
            <Group justify="space-between">
              <Text size="sm">{BUNDLE.name}</Text>
              <Text size="sm">−{money(order.discountCents)}</Text>
            </Group>
          )}
          <Group justify="space-between">
            <Text size="sm">{pickup ? "Local pickup, Pittsburgh" : "Flat-rate shipping"}</Text>
            <Text size="sm">{pickup ? "Free" : money(order.shippingCents)}</Text>
          </Group>
          {order.taxCents > 0 && (
            <Group justify="space-between">
              <Text size="sm">Sales tax</Text>
              <Text size="sm">{money(order.taxCents)}</Text>
            </Group>
          )}
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              Total
            </Text>
            <Text fw={600}>{money(order.totalCents)}</Text>
          </Group>
        </Stack>
      </Box>

      <Stack gap="xs">
        <Text size="xs" tt="uppercase" fw={600} c="dimmed">
          What happens next
        </Text>
        <Text size="sm" style={{ lineHeight: 1.6 }}>
          {pickup
            ? "I'll email you to arrange a time to pick up in Pittsburgh."
            : "I'll pack your order carefully and ship it to the address you gave at checkout. Originals ship within 3–5 business days."}
        </Text>
        <Text size="sm" c="dimmed">
          Questions? Email hello@cassandrawilcoxart.com or DM @casswilcoxart.
        </Text>
      </Stack>

      {/* A buyer is the warmest possible subscriber. */}
      <Divider color="#e8e8e0" />
      <EmailSignup />

      <Anchor component={Link} to="/" size="sm">
        Back to the gallery
      </Anchor>
    </Stack>
  );
}

export const Component = CheckoutSuccess;
