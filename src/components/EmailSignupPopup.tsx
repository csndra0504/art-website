import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Anchor, Button, Modal, Stack, Text, TextInput } from "@mantine/core";
import { usePostHog } from "@posthog/react";
import { useLocation } from "react-router-dom";
import { isValidEmail, submitEmail } from "../lib/brevo";
import { trackLead } from "../lib/analytics";
import { useCart } from "../lib/cartContext";
import { dismissNow, isDismissed, SIGNUP_BANNER_KEY } from "../lib/bannerDismissal";

// Signup popup, replacing the header banner. A popup that fires on arrival costs
// more than it earns: most visitors land on a piece and are deciding whether to
// buy, and Google demotes mobile pages that cover the content on entry. So it
// waits, and stays away from anywhere a purchase is in progress.
//
// Two triggers: a timer (everywhere but product pages) and exit intent (desktop
// only, product pages included). Whichever fires first shows it once per session.
//
// Dismissal reuses the banner's storage key, so people who already subscribed
// (stored as "forever" by submitEmail) never see it.

const REMIND_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
// Time on a page before the timer fires; shorter once they've browsed a few pages.
const DELAY_MS = 20_000;
const ENGAGED_DELAY_MS = 6_000;
const ENGAGED_PAGES = 3;
// Dwell before leaving the window counts as exit intent.
const EXIT_ARM_MS = 8_000;

const PAGES_KEY = "signup-popup-pages";
const SHOWN_KEY = "signup-popup-shown";

// No trigger at all: the cart, the post-payment page, and /subscribe, which is
// already the signup form.
const NEVER_PATHS = [/^\/cart/, /^\/checkout/, /^\/subscribe/];
// No timer: a product page is where someone is deciding whether to buy.
const TIMER_SUPPRESSED_PATHS = [/^\/artwork\//];

const HONEYPOT_STYLE: React.CSSProperties = {
  position: "absolute",
  left: "-10000px",
  width: 1,
  height: 1,
  opacity: 0,
};

// sessionStorage can throw (blocked storage); the popup then just follows its
// timer and never remembers the session, which is acceptable.
function readPages(): number {
  try {
    return Number(sessionStorage.getItem(PAGES_KEY)) || 0;
  } catch {
    return 0;
  }
}

type Status = "idle" | "submitting" | "success" | "error";

export function EmailSignupPopup({ suppress = false }: { suppress?: boolean }) {
  const posthog = usePostHog();
  const { pathname } = useLocation();
  const { count, ready } = useCart();
  const [opened, setOpened] = useState(false);
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // Counted per route change so "browsed a few pages" is measurable. Declared
  // before the scheduling effect: effects run in order.
  useEffect(() => {
    try {
      sessionStorage.setItem(PAGES_KEY, String(readPages() + 1));
    } catch {
      // Storage unavailable; the longer delay applies.
    }
  }, [pathname]);

  // Someone with items in the cart is mid-purchase. Wait for `ready`: the cart
  // hydrates from storage after mount and reads as empty until then.
  const blocked = suppress || !ready || count > 0;

  useEffect(() => {
    if (blocked || NEVER_PATHS.some((p) => p.test(pathname))) return;
    if (isDismissed(SIGNUP_BANNER_KEY, REMIND_AFTER_MS)) return;

    const alreadyShown = () => {
      try {
        return !!sessionStorage.getItem(SHOWN_KEY);
      } catch {
        return false; // Treated as not yet shown.
      }
    };
    if (alreadyShown()) return;

    const show = (trigger: "timer" | "exit_intent") => {
      // Two triggers race; whichever fires first wins and the other stands down.
      if (alreadyShown()) return;
      try {
        sessionStorage.setItem(SHOWN_KEY, "1");
      } catch {
        // Storage unavailable; it may show again next page this session.
      }
      setOpened(true);
      posthog?.capture("signup_popup_shown", { path: pathname, trigger });
    };

    const cleanups: (() => void)[] = [];

    // Timer: not on product pages, where it would land mid-decision.
    if (!TIMER_SUPPRESSED_PATHS.some((p) => p.test(pathname))) {
      const timer = setTimeout(
        () => show("timer"),
        readPages() >= ENGAGED_PAGES ? ENGAGED_DELAY_MS : DELAY_MS
      );
      cleanups.push(() => clearTimeout(timer));
    }

    // Exit intent: the pointer leaving through the top of the window, toward the
    // tab bar or the back button. Fine on product pages — a visitor already on
    // their way out isn't mid-purchase. Needs a real pointer: touch screens have
    // no equivalent signal, so phones rely on the timer alone.
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      // Armed after a short dwell so a visitor who bounces straight back out
      // isn't greeted with a popup they never had a reason to want.
      let armed = false;
      const armTimer = setTimeout(() => {
        armed = true;
      }, EXIT_ARM_MS);
      const onLeave = (e: MouseEvent) => {
        if (armed && e.clientY <= 0) show("exit_intent");
      };
      document.documentElement.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        clearTimeout(armTimer);
        document.documentElement.removeEventListener("mouseleave", onLeave);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [pathname, blocked, posthog]);

  const handleClose = () => {
    setOpened(false);
    // A completed signup is already stored as permanent by submitEmail.
    if (status !== "success") {
      dismissNow(SIGNUP_BANNER_KEY);
      posthog?.capture("signup_popup_dismissed");
    }
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
      await submitEmail(email, "popup", honeypot);
      trackLead("email_signup", { method: "popup" });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      centered
      radius={0}
      size="md"
      padding="xl"
      title={
        <Text fw={700} size="lg" style={{ letterSpacing: "-0.01em" }}>
          {status === "success" ? "You're on the list." : "Join the email list"}
        </Text>
      }
      overlayProps={{ backgroundOpacity: 0.45 }}
    >
      {status === "success" ? (
        <Stack gap="md">
          <Text size="sm" style={{ lineHeight: 1.7 }}>
            Check your inbox to confirm your subscription. Once you click the link, you're in.
          </Text>
          <Button onClick={handleClose} color="dark" radius={0} variant="outline">
            Back to browsing
          </Button>
        </Stack>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Stack gap="sm">
            <Text size="sm" style={{ lineHeight: 1.7 }}>
              New originals and print releases, plus where to find me around Pittsburgh.
              Once or twice a month, no spam.
            </Text>
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
              size="md"
              disabled={status === "submitting"}
              aria-label="Email address"
              data-autofocus
            />
            <Button type="submit" color="dark" radius={0} size="md" loading={status === "submitting"}>
              Join the list
            </Button>

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
              <Text size="sm" c="red" role="alert">
                Something went wrong. Please check the address and try again.
              </Text>
            )}

            <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
              Unsubscribe any time. Emails are sent through Brevo; see{" "}
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
        </form>
      )}
    </Modal>
  );
}
