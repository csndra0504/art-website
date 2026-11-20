import { useEffect, useMemo, useState } from "react";
import { usePostHog } from "@posthog/react";
import { Box, Button, Image, SimpleGrid, Stack, Text } from "@mantine/core";
import { getAddOns, type AddOnProduct } from "../lib/queries";
import { urlFor } from "../lib/sanity";
import { useCart } from "../lib/cartContext";
import {
  MissingShippingTypeError,
  shippingCents,
  type FulfillmentMethod,
} from "../lib/shipping";

const SHOWN = 3;

// Magnets offered inside the cart. On its own a magnet carries $5 postage —
// most of its $8 price — but in an order with a print or original it shares the
// mailer, so the cart is the one place the honest pitch is "add this for $8".
export function AddOns({ fulfillment }: { fulfillment: FulfillmentMethod }) {
  const posthog = usePostHog();
  const { lines, add, ready } = useCart();
  const [items, setItems] = useState<AddOnProduct[]>([]);

  useEffect(() => {
    getAddOns()
      .then(setItems)
      .catch(() => {});
  }, []);

  // Not already in the cart, and pieces whose artwork is already in the cart
  // first — someone buying the print of a scene is the likeliest to want its
  // magnet. Array.sort is stable, so newest-first order holds within each group.
  const shown = useMemo(() => {
    const inCart = new Set(lines.map((l) => l.productId));
    const slugs = new Set(lines.map((l) => l.slug));
    return items
      .filter((i) => !inCart.has(i._id))
      .sort((a, b) => Number(slugs.has(b.subject.slug)) - Number(slugs.has(a.subject.slug)))
      .slice(0, SHOWN);
  }, [items, lines]);

  // Say "no extra postage" only when it is true for every tile shown, using the
  // same rule checkout does. Anything uncertain (a line with no band) says nothing.
  const noExtraPostage = useMemo(() => {
    if (fulfillment === "pickup" || shown.length === 0) return false;
    try {
      const base = shippingCents(
        lines.map((l) => ({ shippingType: l.shippingType, qty: l.qty })),
        "ship"
      );
      return shown.every(
        (i) =>
          shippingCents(
            [
              ...lines.map((l) => ({ shippingType: l.shippingType, qty: l.qty })),
              { shippingType: i.shippingType, qty: 1 },
            ],
            "ship"
          ) === base
      );
    } catch (err) {
      if (err instanceof MissingShippingTypeError) return false;
      throw err;
    }
  }, [lines, shown, fulfillment]);

  if (shown.length === 0) return null;

  const addItem = (i: AddOnProduct) => {
    add({
      productId: i._id,
      qty: 1,
      slug: i.subject.slug,
      title: i.subject.title,
      optionTitle: i.title,
      price: i.price,
      shippingType: i.shippingType,
      kind: i.kind,
      image: i.subject.image
        ? urlFor(i.subject.image.asset).width(128).height(128).fit("crop").auto("format").url()
        : undefined,
    });
    posthog?.capture("cart_addon_added", { product_id: i._id, kind: i.kind, price: i.price });
  };

  return (
    <Box p="md" style={{ border: "1px solid #e8e8e0", background: "#fff" }}>
      <Stack gap="xs">
        <div>
          <Text size="xs" tt="uppercase" fw={600} c="dimmed">
            {shown.every((i) => i.kind === "magnet") ? "Add a magnet" : "Add a small extra"}
          </Text>
          {noExtraPostage && (
            <Text size="xs" c="dimmed">
              Ships in the same package, no extra postage.
            </Text>
          )}
        </div>
        <SimpleGrid cols={shown.length} spacing="xs">
          {shown.map((i) => (
            <Stack key={i._id} gap={4}>
              {i.subject.image && (
                <Image
                  src={urlFor(i.subject.image.asset).width(240).height(240).fit("crop").auto("format").url()}
                  alt={i.subject.image.alt ?? i.subject.title}
                  radius={0}
                  style={{ aspectRatio: "1 / 1", objectFit: "cover" }}
                />
              )}
              <Text size="xs" lineClamp={2} style={{ lineHeight: 1.3 }}>
                {i.subject.title}
              </Text>
              <Button
                onClick={() => addItem(i)}
                disabled={!ready}
                variant="outline"
                color="dark"
                radius={0}
                size="compact-xs"
              >
                Add ${i.price.toLocaleString()}
              </Button>
            </Stack>
          ))}
        </SimpleGrid>
      </Stack>
    </Box>
  );
}
