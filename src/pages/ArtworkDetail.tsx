import { useEffect, useMemo, useState } from "react";
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
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useParams, useLoaderData, Link } from "react-router-dom";
import { PortableText } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/react";
import { getArtworkBySlug } from "../lib/queries";
import { urlFor } from "../lib/sanity";
import {
  trackBeginCheckout,
  trackRequestPrint,
  trackViewItem,
  type AnalyticsItem,
} from "../lib/analytics";
import { inBundle } from "../lib/discounts";
import { SeoHead } from "../components/SeoHead";
import { JsonLd } from "../components/JsonLd";
import { buildArtworkJsonLd } from "../lib/structuredData";
import { ShippingReturns } from "../components/ShippingReturns";
import { Testimonials } from "../components/Testimonials";
import { offersFor } from "../lib/offers";
import { useCart } from "../lib/cartContext";
import type { Artwork, SubjectProduct } from "../types/artwork";

// Runs at build time for every slug (see getStaticPaths in App.tsx) so each
// artwork page ships as static HTML with its own content and meta.
export async function loader({ params }: { params: { slug?: string } }) {
  if (!params.slug) return { artwork: null };
  return { artwork: await getArtworkBySlug(params.slug) };
}

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

// The cart is the only way to buy locally. It replaced both the per-product
// Square links and Venmo, which charged the item price with no shipping.
function CartActions({
  product: p,
  artwork,
}: {
  product: SubjectProduct;
  artwork: Artwork;
}) {
  const { add, lines, ready } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const oneOfAKind = p.kind === "original";
  const inCart = lines.some((l) => l.productId === p._id);

  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 2000);
    return () => clearTimeout(t);
  }, [justAdded]);

  const handleAdd = () => {
    const image = artwork.images?.[0];
    add({
      productId: p._id,
      qty: 1,
      oneOfAKind,
      slug: artwork.slug.current,
      title: artwork.title,
      optionTitle: p.title,
      price: p.price,
      shippingType: p.shippingType,
      image: image
        ? urlFor(image.asset).width(128).height(128).fit("crop").auto("format").url()
        : undefined,
    });
    setJustAdded(true);
  };

  // An original can only be in the cart once, so a second add would silently do
  // nothing; say so instead. Disabled until the stored cart has loaded, or an
  // early tap would be overwritten when it does.
  const label = justAdded
    ? "Added ✓"
    : oneOfAKind && inCart
      ? "In cart"
      : "Add to cart";

  return (
    <Button
      onClick={handleAdd}
      disabled={!ready || (oneOfAKind && inCart && !justAdded)}
      variant="filled"
      color="dark"
      radius={0}
      size="sm"
      aria-live="polite"
    >
      {label}
    </Button>
  );
}

// One row per product. The Etsy block only appears when nothing local can be
// bought — Etsy is the fallback for pieces with no print on hand (lib/offers).
function PurchaseOptions({ artwork }: { artwork: Artwork }) {
  const o = offersFor(artwork);
  if (o.products.length === 0 && !o.showEtsy) return null;

  const item = (variant: string, price?: number): AnalyticsItem => ({
    item_id: artwork.slug.current,
    item_name: artwork.title,
    item_variant: variant,
    price,
  });

  return (
    <Stack gap="sm">
      {o.products.map((p) => (
        <ProductRow key={p._id} product={p} artwork={artwork} />
      ))}

      {o.showEtsy && (
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
    </Stack>
  );
}

function ProductRow({
  product: p,
  artwork,
}: {
  product: SubjectProduct;
  artwork: Artwork;
}) {
  const sold = !!p.soldOut;
  return (
    <Box
      p="md"
      style={{
        border: "1px solid #e8e8e0",
        background: sold ? "#fafaf8" : "#fff",
      }}
    >
      <Group justify="space-between" align="center" wrap="wrap" gap="xs">
        <div>
          <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={2}>
            {p.title}
          </Text>
          <Group gap="xs" align="center">
            <Text
              fw={600}
              size="lg"
              td={sold ? "line-through" : undefined}
              c={sold ? "dimmed" : undefined}
            >
              ${p.price.toLocaleString()}
            </Text>
            {sold && (
              <Badge color="red" variant="filled" size="sm" radius={0}>
                Sold
              </Badge>
            )}
          </Group>
        </div>
        {!sold && (
          <CartActions product={p} artwork={artwork} />
        )}
      </Group>
      {!sold && p.kind === "original" && (
        <Text size="xs" c="dimmed" mt="xs" style={{ lineHeight: 1.6 }}>
          One-of-a-kind original. Ships nationally, carefully packaged, or
          arrange local pickup in Pittsburgh. Questions? Email
          hello@cassandrawilcoxart.com.
        </Text>
      )}
      {/* The deal used to be its own "Any 3 postcards" product. Now it's
          applied in the cart, so each 5x7 has to say so or no one finds it. */}
      {!sold && inBundle(p.shippingType) && (
        <Text size="xs" c="dimmed" mt="xs">
          Mix and match: any 3 5x7 prints for $25.
        </Text>
      )}
      {!sold && p.subtitle && (
        <Text size="xs" c="dimmed" mt="xs">
          {p.subtitle}
        </Text>
      )}
    </Box>
  );
}

// Shown on pieces that aren't offered as a print. A single button logs a GA4
// `request_print` signal tagged with the artwork, so demand shows up as an
// anonymous count in Analytics — no email captured, nothing to consent to.
function RequestPrintPrompt({ artwork }: { artwork: Artwork }) {
  const [done, setDone] = useState(false);

  if (offersFor(artwork).hasPrint) return null;

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
            Thanks, noted!
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
  // Seed from the build-time loader so the page renders fully on first paint
  // (and in static HTML for crawlers); refetch on the client for fresh pricing
  // and sold status without waiting for a rebuild.
  // The static loader returns null outright for any path missing from the
  // prerender manifest — i.e. a piece published since the last build — so this
  // must tolerate no loader data at all rather than destructuring blind.
  const loaderData = useLoaderData() as { artwork: Artwork | null } | null;
  const initialArtwork = loaderData?.artwork ?? null;
  const [artwork, setArtwork] = useState<Artwork | null>(initialArtwork);
  // Without build-time data we can't tell "no such piece" from "not fetched
  // yet", so hold the not-found copy until the client fetch settles.
  const [resolved, setResolved] = useState(initialArtwork != null);

  useEffect(() => {
    if (!slug) return;
    getArtworkBySlug(slug)
      .then((data) => {
        if (data) setArtwork(data);
      })
      .catch(() => {})
      .finally(() => setResolved(true));
  }, [slug]);

  // Fire the GA4 view_item once per piece. Headline value = available original,
  // else the cheapest thing that is for sale.
  const viewedSlug = artwork?.slug.current;
  useEffect(() => {
    if (!artwork) return;
    const o = offersFor(artwork);
    const value =
      (!o.originalSold ? o.original?.price : undefined) ??
      o.fromPrice ??
      o.original?.price;
    trackViewItem({
      item_id: artwork.slug.current,
      item_name: artwork.title,
      price: value,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedSlug]);

  // Per-piece SEO/share values, derived in render so <SeoHead> and the JSON-LD
  // are part of the static HTML.
  const seo = useMemo(() => {
    if (!artwork) return null;
    const o = offersFor(artwork);
    const priceBits = [
      o.original && !o.originalSold
        ? `Original $${o.original.price.toLocaleString()}`
        : null,
      o.fromPrice != null ? `from $${o.fromPrice.toLocaleString()}` : null,
    ].filter(Boolean);
    const excerpt = descriptionExcerpt(artwork.description);
    const description =
      [excerpt, priceBits.join(" · ")].filter(Boolean).join(" · ") ||
      `${artwork.title}: hand-drawn Pittsburgh artwork by Cassandra Wilcox.`;
    const shareImage = artwork.images[0]
      ? urlFor(artwork.images[0].asset).width(1200).height(630).fit("crop").url()
      : undefined;
    return { excerpt, description, shareImage };
  }, [artwork]);

  if (!artwork && !resolved) {
    return <Container size="lg" py="xl" mih={400} />;
  }

  if (!artwork) {
    return (
      <Container size="lg" py="xl">
        <SeoHead
          title="Artwork not found | Cassandra Wilcox Art"
          description="This piece could not be found."
        />
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
      {seo && (
        <>
          <SeoHead
            title={`${artwork.title} | Cassandra Wilcox Art`}
            description={seo.description}
            image={seo.shareImage}
            imageAlt={artwork.images[0]?.alt ?? artwork.title}
            path={`/artwork/${artwork.slug.current}`}
            type="article"
          />
          <JsonLd data={buildArtworkJsonLd(artwork, seo.excerpt)} />
        </>
      )}
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

export const Component = ArtworkDetail;
