import { AppShell, Burger, Group, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, Outlet } from "react-router-dom";

export function Layout() {
  const [opened, { toggle }] = useDisclosure();

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
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar py="md" px="md">
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }} onClick={toggle}>
          Home
        </Link>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
