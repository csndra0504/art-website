# CAS-37 — linking the website to your Square catalog

Dry run read 2026-09-22 from the live catalog (location `LX5Q5JNT4SBBF`) and the
published Sanity products. **The catalog work was applied the same day**, after
Cassandra approved it. The links themselves are not written into Sanity yet —
that needs the write token, at go-live. Machine-readable list:
[square-mapping.json](square-mapping.json).

**51 of the site's 64 sellable products now have a Square item.** Every price
matches. The 13 without one are the 12 sold-out originals (nobody can buy them
either way) and the catch-all 5x7 page that retires on merge day (CAS-61).

## What was done in Square, 2026-09-22

**Split "Single Post Card - 5x7 in" into twelve per-design items.** It held
twelve designs as variations; they're now separate items named
`Print, 5x7, <design>`, matching the newer items (Thunderbird, Sphinx, Skyline).
Each carried its count across — 100, or 99 for Bryant Street Market, Dippy and
Heinz Ketchup. The old variations were set to 0 and the old item **archived**
(renamed "… (replaced by per-design items)"), so its sales history is intact.
The "Kennywod" typo is fixed in the new name.

**Created the fifteen items the website had and Square didn't:**

| Created | Price | Opening stock |
|---|---|---|
| Print, 8x10, Biddles Escape · Bryant Street Market · Coffee Tree · Highland Park Houses · Kaibur Coffee · Mr. Smalls · Park Place Pub · Row House Cinema · Tazza D'oro · Thunderbird Cafe & Music Hall | $30 | 100 each |
| Print, 5x7, Highland Park Fountain | $10 | 100 |
| Original, 8x6, Christi Pitts Park 1 | $100 | 1 |
| Original, 6x8, Christi Pitts Park 2 | $100 | 1 |
| Original, 8x6, Trinity Bellwoods Park | $100 | 1 |
| Original - Framed - West Penn Rec Center | $250 | 1 |

All 27 new items track inventory, carry the same tax as the rest of the catalog,
and are hidden from Square Online, since the website sells them through its own
checkout. **The print counts of 100 are placeholders** copied from how the
postcard variations were counted — correct any of them in Square and the website
follows within seconds.

## Five Square items with no website product

`Print, 5x7, Heinz Ketchup` · `Bryant Street Market` · `Kaibur Coffee` ·
`Biddles Escape` · `Mr. Smalls` — 5x7s in stock that the website never offers.
Adding a product for each in the Studio takes a few fields, and they'd join the
any-3-for-$25 deal.

Also in Square and deliberately not on the website: **Custom Commission** ($400,
handled by the commissions page), **3 postcards (5x7)** ($25, replaced by the
automatic deal), the parked **Titty Sphinx** framed original, and
**Print, 5x7 (8x10 Frame), Kaibur** ($40, no framed Kaibur on the site).

## What happens at go-live

Each website product gets its Square variation id written into Sanity. From then
on, checkout charges Square's price for that exact item, and Square's stock count
decides whether it can be bought — so a piece sold at a market goes unavailable
on the website by itself.

**Not yet verified:** whether Square adds sales tax to a website order. Your
items are marked taxable for the POS. Our orders don't ask Square to apply taxes,
so the expectation is no tax online, matching the cart's total — but it must be
checked with one real order before go-live (PRD §6 tracks the wider tax
question).
