import { Anchor, AppShell, Burger, Group, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, Outlet } from "react-router-dom";

const NAV_LINKS = [{ label: "Home", to: "/" }];

export function Layout() {
  const [opened, { toggle, close }] = useDisclosure();

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
        <Group h="100%" px="md" justify="space-between">
          <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
            <Title order={3}>Cass Art</Title>
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

          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        </Group>
      </AppShell.Header>

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
    </AppShell>
  );
}
