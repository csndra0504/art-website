import { Container } from "@mantine/core";
import { EmailSignup } from "../components/EmailSignup";
import { SeoHead } from "../components/SeoHead";

export function Subscribe() {
  return (
    <Container size="lg" py={60}>
      <SeoHead
        title="Subscribe — Cassandra Wilcox Art"
        description="Join the email list for new originals, print releases, and where to find Cassandra Wilcox at markets and shows around Pittsburgh."
        path="/subscribe"
      />
      <EmailSignup />
    </Container>
  );
}

export const Component = Subscribe;
