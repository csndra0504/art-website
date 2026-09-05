import {
  ActionIcon,
  Anchor,
  AppShell,
  Burger,
  Container,
  Group,
  Indicator,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, Outlet } from "react-router-dom";
import { useCart } from "../lib/cartContext";
import { CartDrawer } from "./CartDrawer";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Events", to: "/events" },
  { label: "Commissions", to: "/commissions" },
];

// Inline rather than from an icon package — the site has no icon dependency and
// this is the only glyph it needs.
function CartGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.55L21 8H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

export function Layout() {
  const [opened, { toggle, close }] = useDisclosure();
  const [cartOpened, { open: openCart, close: closeCart }] = useDisclosure();
  const { count, ready } = useCart();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 200,
        breakpoint: "sm",
        collapsed: { desktop: true, mobile: !opened },
      }}
      padding="md"
      styles={{
        main: { backgroundColor: "#FAFAF8" },
      }}
    >
      <AppShell.Header
        style={{ backgroundColor: "#FAFAF8", borderBottom: "1px solid #e8e8e0" }}
      >
        <Container size="lg" h="100%">
          <Group h="100%" justify="space-between">
            <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
              <Title order={3}>Cassandra Wilcox Art</Title>
            </Link>

            <Group gap="lg" visibleFrom="sm">
              {NAV_LINKS.map((link) => (
                <Anchor
                  key={link.to}
                  component={Link}
                  to={link.to}
                  size="sm"
                  c="dark"
                  underline="never"
                >
                  {link.label}
                </Anchor>
              ))}
            </Group>

            <Group gap="xs" wrap="nowrap">
              {/* The cart hydrates from localStorage after mount, so the badge
                  is suppressed until then — otherwise every visitor sees an
                  empty cart flash a count in. */}
              <Indicator
                label={count}
                size={16}
                color="brick.6"
                radius={0}
                disabled={!ready || count === 0}
                offset={4}
              >
                <ActionIcon
                  variant="subtle"
                  color="dark"
                  radius={0}
                  size="lg"
                  onClick={openCart}
                  aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
                >
                  <CartGlyph />
                </ActionIcon>
              </Indicator>
              <Burger
                opened={opened}
                onClick={toggle}
                hiddenFrom="sm"
                size="sm"
              />
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <CartDrawer opened={cartOpened} onClose={closeCart} />

      <AppShell.Navbar py="md" px="md">
        <Stack gap="sm">
          {NAV_LINKS.map((link) => (
            <Anchor
              key={link.to}
              component={Link}
              to={link.to}
              size="sm"
              c="dark"
              underline="never"
              onClick={close}
            >
              {link.label}
            </Anchor>
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer
        p="md"
        style={{
          position: "relative",
          backgroundColor: "#FAFAF8",
          borderTop: "1px solid #e8e8e0",
        }}
      >
        <Container size="lg">
          <Group justify="space-between" align="center" wrap="wrap">
            <Text size="sm" c="dimmed">
              &copy; {new Date().getFullYear()} Cassandra Wilcox Art
            </Text>
            <Group gap="md">
              <Anchor
                href="https://instagram.com/casswilcoxart"
                target="_blank"
                size="sm"
                c="dark"
                underline="never"
              >
                Instagram
              </Anchor>
              <Anchor
                href="https://www.etsy.com/shop/CassWilcoxArt"
                target="_blank"
                size="sm"
                c="dark"
                underline="never"
              >
                Etsy
              </Anchor>
            </Group>
          </Group>
        </Container>
      </AppShell.Footer>
    </AppShell>
  );
}
