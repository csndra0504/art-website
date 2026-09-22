# Spike result — online order → inventory (CAS-29)

Run 2026-09-05T19:00:02.765Z · Square-Version 2025-01-23 · sandbox
Variation `T4BFVOZLRIAHRRXBGUGNEA65` (SKU `SPIKE-1788634709192`) · order `EOocEBbkan1u30Mo4bP47kkFPc4F`

**Verdict:** paid online orders DO auto-decrement (~6s after payment).
The webhook only mirrors the result into Sanity.

Stock 3 → 2.

| t | order state | stock | fulfillments |
|---|---|---|---|
| +0s | OPEN | 3 | SHIPMENT:PROPOSED |
| +6s | OPEN | 2 | SHIPMENT:PROPOSED |
