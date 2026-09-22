import { useEffect, useRef } from "react";
import { Container, Title } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { SeoHead } from "../components/SeoHead";
import { CartContents } from "../components/CartContents";
import { useCart } from "../lib/cartContext";
import { trackViewCart } from "../lib/analytics";

// Full-page cart: a linkable address for the cart, and a fallback for any device
// where the drawer misbehaves. Same contents as the drawer. Prerendered as an
// empty shell, because the cart lives in the visitor's browser.
export function CartPage() {
  const navigate = useNavigate();
  const { lines, total, ready, refresh } = useCart();

  // Once per visit, after the stored cart has loaded, so the event carries what
  // the visitor actually sees rather than the empty first render.
  const tracked = useRef(false);
  useEffect(() => {
    if (!ready || tracked.current) return;
    tracked.current = true;
    refresh();
    trackViewCart(
      lines.map((l) => ({
        item_id: l.slug,
        item_name: l.title,
        item_variant: l.optionTitle,
        price: l.price,
        quantity: l.qty,
      })),
      total,
      "page"
    );
  }, [ready, lines, total, refresh]);

  return (
    <Container size="xs" py="xl">
      <SeoHead title="Cart | Cassandra Wilcox Art" description="Your cart." noindex />
      <Title order={2} mb="lg">
        Cart
      </Title>
      {ready && <CartContents onBrowse={() => navigate("/")} />}
    </Container>
  );
}

export const Component = CartPage;
