const BREVO_FORM_URL =
  "https://73785543.sibforms.com/serve/MUIFAH8XNHYtbuIv7pPtCI1U6pWMqtx5eTxQxLWX6XnDgS-ZQHMqMJ-BI6AbG2PQrkR7YY836YMfE9YtqoSO2RZF0osLk7zSJHaAYRi7EASwyGDNgBY7LliZpQMBbNHfR0WWYU663xgKFozBJ6Tk1Ji0fFv1aTl4lCLZfTB5vYYXLjpN5vnRxr3JnDyBurKZjWoLu3hWtv7qP92_jA==";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignupSource = "inline" | "banner";

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export async function submitEmail(
  email: string,
  source: SignupSource,
  honeypot = ""
): Promise<void> {
  const body = new URLSearchParams({
    EMAIL: email.trim(),
    email_address_check: honeypot,
    locale: "en",
  });

  // Brevo's sibforms endpoint does not send CORS headers, so we use
  // no-cors and treat absence of network error as success. Brevo sends
  // a double opt-in email regardless, which is the actual confirmation.
  await fetch(BREVO_FORM_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  console.log({
    event: "email_signup",
    source,
    timestamp: new Date().toISOString(),
  });
}
