import express from "express";

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

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const server = app.listen(PORT, () => {
  console.log(`cass-art-api listening on :${PORT}`);
});

// `docker stop` sends SIGTERM. Let in-flight requests finish — a checkout
// halfway through creating a Square order — before the process exits.
const shutdown = () => server.close(() => process.exit(0));
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
