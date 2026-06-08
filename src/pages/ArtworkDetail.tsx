import { useEffect, useState } from "react";
import {
  Anchor,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Group,
  Image,
  Loader,
  Center,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useParams, Link } from "react-router-dom";
import { useDocumentTitle } from "@mantine/hooks";
import { PortableText } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/react";
import { getArtworkBySlug } from "../lib/queries";
import { urlFor } from "../lib/sanity";
import {
  trackBeginCheckout,
  trackRequestPrint,
  trackViewItem,
  type AnalyticsItem,
  type PaymentType,
} from "../lib/analytics";
import { setPageMeta } from "../lib/meta";
import { ShippingReturns } from "../components/ShippingReturns";
import { Testimonials } from "../components/Testimonials";
import type { Artwork } from "../types/artwork";

// Pull a plain-text excerpt out of the PortableText description for use in meta
// tags (search snippets / link previews). Falls back to empty string.
function descriptionExcerpt(
  blocks: PortableTextBlock[] | undefined,
  max = 160,
): string {
  if (!blocks) return "";
  const text = blocks
    .filter((b) => b._type === "block")
    .map((b) =>
      ((b.children as { text?: string }[] | undefined) ?? [])
        .map((c) => c.text ?? "")
        .join(""),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

const VENMO_HANDLE = "cassandrawilcox";

function venmoUrl(amount: number, note: string) {
  return `https://venmo.com/${VENMO_HANDLE}?txn=pay&amount=${amount}&note=${encodeURIComponent(note)}`;
}

// One-tap card checkout via a Square link when available, with Venmo as a
// lower-friction fallback. Card-first lowers the barrier for new visitors who
// don't already use Venmo.
function BuyButtons({
  squareUrl,
  venmoHref,
  onCheckout,
}: {
  squareUrl?: string;
  venmoHref: string;
  onCheckout?: (method: PaymentType) => void;
}) {
  if (squareUrl) {
    return (
      <Group gap="xs" wrap="wrap" justify="flex-end">
        <Button
          component="a"
          href={squareUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onCheckout?.("card")}
          variant="filled"
          color="dark"
          radius={0}
          size="sm"
        >
          Buy with card
        </Button>
        <Button
          component="a"
          href={venmoHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onCheckout?.("venmo")}
          variant="subtle"
          color="dark"
          radius={0}
          size="sm"
        >
          or Venmo
        </Button>
      </Group>
    );
  }
  return (
    <Button
      component="a"
      href={venmoHref}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onCheckout?.("venmo")}
      variant="filled"
      color="dark"
      radius={0}
      size="sm"
    >
      Buy via Venmo
    </Button>
  );
}

function PurchaseOptions({ artwork }: { artwork: Artwork }) {
  const hasOriginal = artwork.originalPrice != null;
  const hasEtsy = !!artwork.printEtsyUrl;
  const hasLocalPrint = artwork.printLocalPrice != null;
  const customOptions = (artwork.customOptions ?? []).filter(
    (opt) => opt.visible !== false
  );

  if (!hasOriginal && !hasEtsy && !hasLocalPrint && customOptions.length === 0)
    return null;

  const item = (variant: string, price?: number): AnalyticsItem => ({
    item_id: artwork.slug.current,
    item_name: artwork.title,
    item_variant: variant,
    price,
  });

  return (
    <Stack gap="sm">
      {hasOriginal && (
        <Box
          p="md"
          style={{
            border: "1px solid #e8e8e0",
            background: artwork.originalSold ? "#fafaf8" : "#fff",
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap" gap="xs">
            <div>
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={2}>
                Original
              </Text>
              <Group gap="xs" align="center">
                <Text
                  fw={600}
                  size="lg"
                  td={artwork.originalSold ? "line-through" : undefined}
                  c={artwork.originalSold ? "dimmed" : undefined}
                >
                  ${artwork.originalPrice!.toLocaleString()}
                </Text>
                {artwork.originalSold && (
                  <Badge color="red" variant="filled" size="sm" radius={0}>
                    Sold
                  </Badge>
                )}
              </Group>
            </div>
            {!artwork.originalSold && (
              <BuyButtons
                squareUrl={artwork.originalSquareUrl}
                venmoHref={venmoUrl(
                  artwork.originalPrice!,
                  `Original — ${artwork.title}`
                )}
                onCheckout={(m) =>
                  trackBeginCheckout(item("Original", artwork.originalPrice), m)
                }
              />
            )}
          </Group>
          {!artwork.originalSold && (
            <Text size="xs" c="dimmed" mt="xs" style={{ lineHeight: 1.6 }}>
              One-of-a-kind original. Ships nationally, carefully packaged, or
              arrange local pickup in Pittsburgh. Questions? Email
              hello@cassandrawilcoxart.com.
            </Text>
          )}
        </Box>
      )}

      {hasEtsy && (
        <Box p="md" style={{ border: "1px solid #e8e8e0" }}>
          <Group justify="space-between" align="center" wrap="wrap" gap="xs">
            <div>
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={2}>
                8×10 Print
              </Text>
              {artwork.printEtsyPrice != null ? (
                <Text fw={600} size="lg">
                  ${artwork.printEtsyPrice.toLocaleString()}
                </Text>
              ) : (
                <Text size="sm">Available on Etsy</Text>
              )}
            </div>
            <Button
              component="a"
              href={artwork.printEtsyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackBeginCheckout(item("Print — Etsy", artwork.printEtsyPrice), "etsy")
              }
              variant="outline"
              color="dark"
              radius={0}
              size="sm"
            >
              Order Print
            </Button>
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            Ships via Etsy
          </Text>
        </Box>
      )}

      {hasLocalPrint && (
        <Box
          p="md"
          style={{
            border: "1px solid #e8e8e0",
            background: artwork.printLocalSold ? "#fafaf8" : "#fff",
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap" gap="xs">
            <div>
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={2}>
                8×10 Print — Local Pickup
              </Text>
              <Group gap="xs" align="center">
                <Text
                  fw={600}
                  size="lg"
                  td={artwork.printLocalSold ? "line-through" : undefined}
                  c={artwork.printLocalSold ? "dimmed" : undefined}
                >
                  ${artwork.printLocalPrice!.toLocaleString()}
                </Text>
                {artwork.printLocalSold && (
                  <Badge color="red" variant="filled" size="sm" radius={0}>
                    Sold
                  </Badge>
                )}
              </Group>
            </div>
            {!artwork.printLocalSold && (
              <Button
                component="a"
                href={venmoUrl(
                  artwork.printLocalPrice!,
                  `Print — ${artwork.title}`
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackBeginCheckout(
                    item("Print — Local Pickup", artwork.printLocalPrice),
                    "venmo"
                  )
                }
                variant="filled"
                color="dark"
                radius={0}
                size="sm"
              >
                Buy via Venmo
              </Button>
            )}
          </Group>
          {!artwork.printLocalSold && (
            <Text size="xs" c="dimmed" mt="xs">
              Arrange pickup via email or DM
            </Text>
          )}
        </Box>
      )}

      {customOptions.map((opt) => (
        <Box key={opt._key} p="md" style={{ border: "1px solid #e8e8e0" }}>
          <Group justify="space-between" align="center" wrap="wrap" gap="xs">
            <div>
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={2}>
                {opt.title}
              </Text>
              <Text fw={600} size="lg">
                ${opt.price.toLocaleString()}
              </Text>
            </div>
            <BuyButtons
              squareUrl={opt.squareUrl}
              venmoHref={venmoUrl(
                opt.price,
                opt.venmoNote ?? `${opt.title} — ${artwork.title}`
              )}
              onCheckout={(m) => trackBeginCheckout(item(opt.title, opt.price), m)}
            />
          </Group>
          {opt.subtitle && (
            <Text size="xs" c="dimmed" mt="xs">
              {opt.subtitle}
            </Text>
          )}
        </Box>
      ))}
    </Stack>
  );
}

// Shown on pieces that aren't offered as a print. A single button logs a GA4
// `request_print` signal tagged with the artwork, so demand shows up as an
// anonymous count in Analytics — no email captured, nothing to consent to.
function RequestPrintPrompt({ artwork }: { artwork: Artwork }) {
  const [done, setDone] = useState(false);

  const hasPrint =
    !!artwork.printEtsyUrl ||
    artwork.printLocalPrice != null ||
    (artwork.customOptions ?? []).some(
      (opt) => opt.visible !== false && opt.kind === "print"
    );
  if (hasPrint) return null;

  const handleRequest = () => {
    trackRequestPrint({
      item_id: artwork.slug.current,
      item_name: artwork.title,
      item_variant: "Print (requested)",
    });
    setDone(true);
  };

  return (
    <Box p="md" style={{ border: "1px dashed #d4d4c8", background: "#fafaf8" }}>
      {done ? (
        <Stack gap={4}>
          <Text size="sm" fw={600}>
            Thanks &mdash; noted!
          </Text>
          <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
            The more interest a piece gets, the sooner I make prints of it. Want
            to make sure you hear when it&rsquo;s ready? DM{" "}
            <Anchor
              href="https://instagram.com/casswilcoxart"
              target="_blank"
              rel="noopener noreferrer"
            >
              @casswilcoxart
            </Anchor>{" "}
            or email hello@cassandrawilcoxart.com.
          </Text>
        </Stack>
      ) : (
        <Stack gap="xs">
          <div>
            <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={2}>
              No print yet
            </Text>
            <Text size="sm" style={{ lineHeight: 1.5 }}>
              Want this as a print? Let me know there&rsquo;s interest and
              I&rsquo;ll prioritize making one.
            </Text>
          </div>
          <Button
            onClick={handleRequest}
            variant="outline"
            color="dark"
            radius={0}
            size="sm"
            style={{ alignSelf: "flex-start" }}
          >
            Request a print
          </Button>
        </Stack>
      )}
    </Box>
  );
}

export function ArtworkDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getArtworkBySlug(slug)
      .then((data) => {
        setArtwork(data);
        if (data) {
          // Headline value = available original, else cheapest print.
          const prints = [data.printEtsyPrice, data.printLocalPrice].filter(
            (n): n is number => n != null
          );
          const value =
            data.originalPrice != null && !data.originalSold
              ? data.originalPrice
              : prints.length
                ? Math.min(...prints)
                : data.originalPrice;
          trackViewItem({
            item_id: data.slug.current,
            item_name: data.title,
            price: value,
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  useDocumentTitle(
    artwork ? `${artwork.title} — Cassandra Wilcox Art` : "Cassandra Wilcox Art"
  );

  // Per-piece meta: correct title, snippet, and the artwork's own image for
  // search results and JS-rendering crawlers. Restores prior tags on unmount so
  // navigating to another route doesn't inherit this piece's preview.
  useEffect(() => {
    if (!artwork) return;
    const priceBits = [
      artwork.originalPrice != null && !artwork.originalSold
        ? `Original $${artwork.originalPrice.toLocaleString()}`
        : null,
      artwork.printEtsyPrice != null || artwork.printLocalPrice != null
        ? `prints from $${Math.min(
            ...[artwork.printEtsyPrice, artwork.printLocalPrice].filter(
              (n): n is number => n != null
            )
          ).toLocaleString()}`
        : null,
    ].filter(Boolean);
    const excerpt = descriptionExcerpt(artwork.description);
    const description =
      [excerpt, priceBits.join(" · ")].filter(Boolean).join(" — ") ||
      `${artwork.title} — hand-drawn Pittsburgh artwork by Cassandra Wilcox.`;

    const shareImage = artwork.images[0]
      ? urlFor(artwork.images[0].asset).width(1200).height(630).fit("crop").url()
      : undefined;

    return setPageMeta({
      title: `${artwork.title} — Cassandra Wilcox Art`,
      description,
      image: shareImage,
      url: `/artwork/${artwork.slug.current}`,
      type: "article",
    });
  }, [artwork]);

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
        <Text c="red">Failed to load artwork: {error}</Text>
      </Container>
    );
  }

  if (!artwork) {
    return (
      <Container size="lg" py="xl">
        <Text c="dimmed">Artwork not found.</Text>
        <Anchor component={Link} to="/" size="sm" mt="sm">
          Back to gallery
        </Anchor>
      </Container>
    );
  }

  const meta = [artwork.medium, artwork.dimensions, artwork.year]
    .filter(Boolean)
    .join(" · ");

  const infoContent = (
    <Stack gap="md">
      {artwork.highlightLabel && (
        <Badge color="brick.6" variant="filled" radius={0} size="md" w="fit-content">
          {artwork.highlightLabel}
        </Badge>
      )}
      <Title order={2}>{artwork.title}</Title>

      {meta && (
        <Text size="sm" c="dimmed">
          {meta}
        </Text>
      )}

      {artwork.forSale && (
        <>
          <Divider color="#e8e8e0" />
          <PurchaseOptions artwork={artwork} />
          <ShippingReturns />
        </>
      )}

      <RequestPrintPrompt artwork={artwork} />

      <Testimonials />

      <Divider color="#e8e8e0" />

      {artwork.description && (
        <div style={{ fontSize: 14, lineHeight: 1.7 }}>
          <PortableText value={artwork.description} />
        </div>
      )}

      {artwork.tags && artwork.tags.length > 0 && (
        <>
          <Divider color="#e8e8e0" />
          <Group gap="xs">
            {artwork.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                color="dark"
                radius={0}
                size="sm"
              >
                {tag}
              </Badge>
            ))}
          </Group>
        </>
      )}
    </Stack>
  );

  return (
    <Container size="lg" py="xl">
      <Anchor
        component={Link}
        to="/"
        size="sm"
        c="dimmed"
        mb="lg"
        display="block"
      >
        &larr; Back to gallery
      </Anchor>

      {/* Mobile layout: thumbnail → info → full images */}
      <Box hiddenFrom="md">
        <Stack gap="lg">
          {artwork.images[0] && (
            <Image
              src={urlFor(artwork.images[0].asset)
                .width(600)
                .auto("format")
                .url()}
              alt={artwork.images[0].alt ?? artwork.title}
              radius={0}
              h={200}
              fit="contain"
              style={{ background: "#f5f5f0" }}
            />
          )}

          {infoContent}

          {artwork.images.length > 0 && (
            <>
              <Divider color="#e8e8e0" />
              <Stack gap="md">
                {artwork.images.map((img, i) => (
                  <Image
                    key={img._key ?? i}
                    src={urlFor(img.asset).width(1200).auto("format").url()}
                    alt={img.alt ?? artwork.title}
                    radius={0}
                    style={{ width: "100%" }}
                  />
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </Box>

      {/* Desktop layout: images left, sticky sidebar right */}
      <Grid gutter="xl" visibleFrom="md">
        <Grid.Col span={7}>
          <Stack gap="md">
            {artwork.images.map((img, i) => (
              <Image
                key={img._key ?? i}
                src={urlFor(img.asset).width(1200).auto("format").url()}
                alt={img.alt ?? artwork.title}
                radius={0}
                style={{ width: "100%" }}
              />
            ))}
          </Stack>
        </Grid.Col>

        <Grid.Col span={5}>
          <div style={{ position: "sticky", top: 80, alignSelf: "start" }}>
            {infoContent}
          </div>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
