import { Container } from "@mantine/core";
import { useDocumentTitle } from "@mantine/hooks";
import { EmailSignup } from "../components/EmailSignup";

export function Subscribe() {
  useDocumentTitle("Subscribe — Cassandra Wilcox Art");
  return (
    <Container size="lg" py={60}>
      <EmailSignup />
    </Container>
  );
}
