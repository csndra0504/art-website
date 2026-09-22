import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { checkoutConfig } from "./config.ts";

// POST /api/square/webhook — Square telling us something changed.
//
// Only one event matters: inventory.count.updated. It fires for every stock
// change, whoever caused it — a website order, a market sale on Square POS, a
// count edited by hand — which is exactly the set the website has to follow.
// Payment and order events aren't needed: stock drops on payment without us
// (PRD §7), and Square emails the order itself.

export interface SquareEvent {
  event_id: string;
  type: string;
  created_at?: string;
  data?: { object?: unknown };
}

type Handler = (event: SquareEvent) => Promise<void>;

// Filled in by the stock mirror (CAS-44). An event type with no handler is
// acknowledged and ignored, so subscribing to more in the dashboard can't break
// anything.
const handlers: Record<string, Handler> = {};

export function onEvent(type: string, handler: Handler) {
  handlers[type] = handler;
}

// Square signs HMAC-SHA256(key, notification URL + raw body). The URL is the one
// saved on the subscription, which can't be rebuilt from the request behind
// nginx, so it's configured rather than guessed.
export function isSignedBySquare(
  rawBody: Buffer,
  signature: string | undefined,
  key: string,
  notificationUrl: string
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", key)
    .update(notificationUrl)
    .update(rawBody)
    .digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Square retries until it gets a 2xx, and may deliver the same event twice.
// The handlers are safe to repeat by design — the mirror *sets* soldOut from
// Square's current count rather than toggling it — so this is only a cheap
// guard against redoing work, not what makes a replay harmless. It lives in
// memory: a restart forgets it, and that's fine for the same reason.
const RECENT_LIMIT = 500;
const recent = new Set<string>();

function remember(eventId: string) {
  recent.add(eventId);
  if (recent.size > RECENT_LIMIT) {
    recent.delete(recent.values().next().value!);
  }
}

export async function handleWebhook(req: Request, res: Response) {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const cfg = checkoutConfig();
  const notificationUrl =
    process.env.SQUARE_WEBHOOK_URL ??
    ("missing" in cfg ? undefined : `${cfg.siteUrl}/api/square/webhook`);
  if (!key || !notificationUrl) {
    // 503, not 200: Square keeps retrying for a while, so events sent before the
    // key is configured aren't lost.
    console.error("Webhook not configured; missing SQUARE_WEBHOOK_SIGNATURE_KEY or URL");
    return res.status(503).end();
  }

  const raw = req.body;
  if (!Buffer.isBuffer(raw)) {
    // A JSON parser ran first and the exact bytes are gone. A wiring bug, not
    // a bad request — every signature would fail, so say so loudly.
    console.error("Webhook body was parsed before verification; check middleware order");
    return res.status(500).end();
  }
  if (!isSignedBySquare(raw, req.get("x-square-hmacsha256-signature"), key, notificationUrl)) {
    console.warn("Webhook rejected: bad or missing signature");
    return res.status(403).end();
  }

  let event: SquareEvent;
  try {
    event = JSON.parse(raw.toString("utf8")) as SquareEvent;
  } catch {
    return res.status(400).end();
  }
  if (!event.event_id || !event.type) return res.status(400).end();

  if (recent.has(event.event_id)) return res.status(200).end();

  const handler = handlers[event.type];
  if (!handler) {
    remember(event.event_id);
    return res.status(200).end();
  }

  try {
    await handler(event);
  } catch (err) {
    // Not remembered, and not a 2xx, so Square sends it again. The sale itself
    // already happened in Square; only the website's copy is behind.
    console.error(`Webhook ${event.type} ${event.event_id} failed:`, err);
    return res.status(500).end();
  }
  remember(event.event_id);
  return res.status(200).end();
}
