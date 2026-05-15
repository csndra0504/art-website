import { Container } from "@mantine/core";
import { EmailSignup } from "../components/EmailSignup";

export function Subscribe() {
  return (
    <Container size="lg" py={60}>
      <EmailSignup />
    </Container>
  );
}
