import { useState } from "react";
import type { FormEvent } from "react";
import {
  Anchor,
  Button,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { isValidEmail, submitEmail } from "../lib/brevo";

type Status = "idle" | "submitting" | "success" | "error";

const HONEYPOT_STYLE: React.CSSProperties = {
  position: "absolute",
  left: "-10000px",
  width: 1,
  height: 1,
  opacity: 0,
};

export function EmailSignup() {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (honeypot) return;
    if (!isValidEmail(email)) {
      setStatus("error");
      return;
    }
    setStatus("submitting");
    try {
      await submitEmail(email, "inline", honeypot);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <Stack gap="sm" maw={640}>
        <Title order={2} fw={700} style={{ letterSpacing: "-0.02em" }}>
          You're on the list.
        </Title>
        <Text size="sm" style={{ lineHeight: 1.7 }}>
          Check your inbox to confirm your subscription &mdash; once you click
          the link, you're in.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md" maw={640}>
      <Title order={2} fw={700} style={{ letterSpacing: "-0.02em" }}>
        Know where I'll be next.
      </Title>
      <Text size="sm" style={{ lineHeight: 1.7 }}>
        Once or twice a month, I send out where you can find me; markets, shows,
        and gallery events around Pittsburgh. No spam, no algorithms, no need
        for social media to know what's coming up!
      </Text>

      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="xs">
          <Text component="label" htmlFor="signup-email" size="sm" fw={700}>
            Email
          </Text>
          <Group gap="sm" wrap="wrap" align="flex-start">
            <TextInput
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.currentTarget.value);
                if (status === "error") setStatus("idle");
              }}
              required
              radius={0}
              size="md"
              style={{ flex: 1, minWidth: 220 }}
              disabled={status === "submitting"}
            />
            <Button
              type="submit"
              color="dark"
              radius={0}
              size="md"
              loading={status === "submitting"}
            >
              Join the list
            </Button>
          </Group>

          <input
            type="text"
            name="email_address_check"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.currentTarget.value)}
            aria-hidden="true"
            style={HONEYPOT_STYLE}
          />

          <Text size="xs" c="dimmed">
            One or two emails a month from Cassandra Wilcox Art. Unsubscribe any
            time.
          </Text>

          {status === "error" && (
            <Text size="sm" c="red">
              Something went wrong. Please try again, or email{" "}
              <Anchor href="mailto:cass@cassandrawilcoxart.com" c="dark">
                cass@cassandrawilcoxart.com
              </Anchor>{" "}
              to subscribe directly.
            </Text>
          )}
        </Stack>
      </form>

      <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
        I use Brevo as my marketing platform. By submitting this form you agree
        that the personal data you provided will be transferred to Brevo for
        processing in accordance with{" "}
        <Anchor
          href="https://www.brevo.com/en/legal/privacypolicy/"
          target="_blank"
          rel="noopener noreferrer"
          c="dark"
        >
          Brevo's Privacy Policy
        </Anchor>
        .
      </Text>
    </Stack>
  );
}
