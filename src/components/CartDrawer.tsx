import { Drawer, Text } from "@mantine/core";
import { useCart } from "../lib/cartContext";
import { CartContents } from "./CartContents";

// The usual way into the cart. /cart shows the same contents as a full page.
export function CartDrawer({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const { count } = useCart();
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
      <CartContents onBrowse={onClose} />
    </Drawer>
  );
}
