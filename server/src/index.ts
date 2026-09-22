import express from "express";
import { createCheckout } from "./checkout.ts";
import { getOrder } from "./order.ts";
import { handleWebhook, onEvent } from "./webhook.ts";
import { mirrorInventory } from "./stockMirror.ts";
import { SQUARE_ENV } from "./config.ts";

// The checkout API. The website itself stays fully static and prerendered; this
// service exists only for the work that needs a secret — creating Square orders
// and receiving Square's webhooks. See docs/cart-checkout/PRD.md §8.

const PORT = Number(process.env.PORT ?? 3001);

const app = express();
app.disable("x-powered-by");

// Deliberately no global express.json(). The Square webhook (CAS-43) has to
// verify its signature against the exact raw bytes Square sent; a body parser
// mounted here would consume and re-serialise them first, and every signature
// would fail. Parse JSON per route instead.

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// JSON parsed for this route only (see the note above). A cart is small; the
// limit stops anyone posting megabytes at it.
app.post("/api/checkout", express.json({ limit: "16kb" }), createCheckout);
app.get("/api/order/:orderId", getOrder);
onEvent("inventory.count.updated", mirrorInventory);
// Raw bytes, any content type: the signature covers the body exactly as sent.
app.post("/api/square/webhook", express.raw({ type: "*/*", limit: "256kb" }), handleWebhook);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Anything unexpected: log the detail, tell the buyer nothing about internals.
// Express only treats a handler as an error handler if it declares all four
// parameters, so `_next` must stay even though it's unused.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

const server = app.listen(PORT, () => {
  console.log(`cass-art-api listening on :${PORT} (Square ${SQUARE_ENV})`);
});

// `docker stop` sends SIGTERM. Let in-flight requests finish — a checkout
// halfway through creating a Square order — before the process exits.
const shutdown = () => server.close(() => process.exit(0));
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
