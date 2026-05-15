import { useState } from "react";
import type { FormEvent } from "react";
import {
  Button,
  CloseButton,
  Container,
  Group,
  Text,
  TextInput,
} from "@mantine/core";
import { isValidEmail, submitEmail } from "../lib/brevo";

type Status = "idle" | "submitting" | "success" | "error";

const DISMISSED_KEY = "email-signup-banner-dismissed";

const HONEYPOT_STYLE: React.CSSProperties = {
  position: "absolute",
  left: "-10000px",
  width: 1,
  height: 1,
  opacity: 0,
};

export function EmailSignupBanner() {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISSED_KEY) === "true"
  );
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (honeypot) return;
    if (!isValidEmail(email)) {
      setStatus("error");
      return;
    }
    setStatus("submitting");
    try {
      await submitEmail(email, "banner", honeypot);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#FAFAF8",
        borderBottom: "1px solid #e8e8e0",
        margin: "calc(var(--mantine-spacing-md) * -1)",
        marginBottom: 0,
      }}
    >
      <Container size="lg" py={10}>
        <Group justify="space-between" wrap="nowrap" gap="sm" align="center">
          {status === "success" ? (
            <Text size="sm" style={{ lineHeight: 1.5 }}>
              You're on the list. Check your inbox to confirm.
            </Text>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              style={{ flex: 1, minWidth: 0 }}
            >
              <Group gap="sm" wrap="wrap" align="center">
                <Text size="sm" style={{ lineHeight: 1.5, flex: "1 1 220px" }}>
                  Know where I'll be next &mdash; Pittsburgh markets and shows
                  in your inbox.
                </Text>
                <Group
                  gap="xs"
                  wrap="nowrap"
                  style={{ flex: "1 1 260px", minWidth: 240 }}
                >
                  <TextInput
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.currentTarget.value);
                      if (status === "error") setStatus("idle");
                    }}
                    required
                    radius={0}
                    size="xs"
                    style={{ flex: 1 }}
                    disabled={status === "submitting"}
                    aria-label="Email address"
                  />
                  <Button
                    type="submit"
                    color="dark"
                    radius={0}
                    size="xs"
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

                {status === "error" && (
                  <Text size="xs" c="red" style={{ flexBasis: "100%" }}>
                    Something went wrong. Please try again.
                  </Text>
                )}
              </Group>
            </form>
          )}
          <CloseButton
            size="sm"
            aria-label="Dismiss signup banner"
            onClick={handleDismiss}
          />
        </Group>
      </Container>
    </div>
  );
}
