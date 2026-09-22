# CAS-37 dry run — linking the website to your Square catalog

Read 2026-09-22 from the live Square catalog (location `LX5Q5JNT4SBBF`) and the
published Sanity products. **Nothing was written.** This is the proposal for you
to check; the machine-readable version is
[square-mapping.json](square-mapping.json).

Every price in Square already matches the website. There are no price conflicts
to settle. Counts check out: 64 sellable products on the site, 36 matched here,
28 not (listed below).

## What happens after you approve

Each website product gets its Square variation id saved against it. From then on
checkout charges Square's price for that exact item and Square's stock count
decides whether it can be bought. Nothing is created or changed in Square.

## 36 products link to items you already have

| Website | Square item |
|---|---|
| 16th St Bridge — 5x7 Print | Single Post Card - 5x7 in → *16th Street Bridge* |
| 16th St Bridge — Framed 5x7 | Print, 5x7 (8x10 Frame), 16th Street Bridge |
| 16th St Bridge — Original | Original, 8x6, 16th St Bridge, Pittsburgh, PA |
| Bananas — 5x7 Print | Single Post Card → *Bananas* |
| Bananas — Framed 5x7 | Print, 5x7 (8x10 Frame), Bananas |
| Kennywood Dog and OG Beer — 5x7 Print | Single Post Card → *Kennywod Dog & Beer* |
| Kennywood Dog and OG Beer — Framed 5x7 | Print, 5x7 (8x10 Frame), Kennywood Dog & OG Beer |
| Brillobox — Original | Original - Framed - Brillobox |
| Cathedral of Learning — Original | Original, Framed, Cathedral of Learning |
| Dippy the Dino — 5x7 Print | Single Post Card → *Dippy the Dino* |
| Dippy the Dino — 8x10 Print | Print, 8x10, Dippy the Dino |
| Dippy the Dino — Framed 5x7 | Print, 5x7 (8x10 Frame), Dippy the Dino |
| Fine View of PGH — Original | Original - Framed - Fine View of PGH |
| Heinz Ketchup Bottle — Framed 5x7 | Print, 5x7 (8x10 Frame), Heinz Ketchup |
| Highland Park Houses — 5x7 Print | Single Post Card → *Highland Park Houses* |
| Highland Park Houses — Framed 5x7 | Print, 5x7 (8x10 Frame), Highland Park Houses |
| Iron City Clock — Framed 5x7 | Print, 5x7 (8x10 Frame), Iron City Clock |
| Iron City Clock — Original *(sold)* | Iron City Clock, Southside, PA - Original Artwork |
| Kaibur 2 — Original *(sold)* | Kaibur 2 - Polish Hill - Original (7x5 in) |
| Max's Allegheny Tavern — Original *(sold)* | Original - Framed - Max's Allegheny Tavern |
| Mr. Smalls — Framed 5x7 | Print, 5x7 (8x10 Frame), Mr. Smalls |
| Park Place Pub — 5x7 Print | Single Post Card → *Park Place Pub* |
| Park Place Pub — Framed 5x7 | Print, 5x7 (8x10 Frame), Park Place Pub |
| Pittsburgh Skyline — 5x7 Print | Print, 5x7, PGH Skyline from North Shore |
| Pittsburgh Skyline — Framed 5x7 | Print, 5x7 (8x10 Frame), PGH Skyline from North Shore |
| Pittsburgh Skyline — Original | Pittsburgh Skyline from North Shore - Original Artwork |
| PNC Park (Ballpoint Mini) — Original *(sold)* | Original - Framed - PNC Park Mini |
| PNC Park (Watercolor) — Original *(sold)* | Original - Framed - PNC Park Watercolor |
| Rialto Street — Framed 5x7 | Print, 5x7 (8x10 Frame), Rialto Street |
| Rock Room — Framed 5x7 | Print, 5x7 (8x10 Frame), Rock Room |
| St. Stanislaus — Original | Original - Framed - St. Stanislaus Catholic Church |
| Tazza D'oro — 5x7 Print | Single Post Card → *Tazza D'oro* |
| Tazza D'oro — Framed 5x7 | Print, 5x7 (8x10 Frame), Tazza D'oro |
| Thunderbird Café — 5x7 Print | Print, 5x7, Thunderbird Cafe & Music Hall |
| Thunderbird Café — Original | Original, Framed, Thunderbird Cafe & Music Hall |
| Titty Sphinx — 5x7 Print | Print - 5x7 - Titty Sphinx |

**Worth knowing:** your single "Single Post Card - 5x7 in" item holds twelve
designs as variations, and the website links to the right variation of it. So a
5x7 sold on the website and one sold at a market draw down the same count.

## 15 things on the website that Square doesn't have

These can't be bought online until they exist in Square. **Ten are 8x10 prints**,
which suggests 8x10s have been a market-and-Etsy line rather than a Square one.

**8x10 prints (all $30):** Biddles Escape · Bryant Street Market · Coffee Tree ·
Highland Park Houses · Kaibur Coffee · Mr. Smalls · Park Place Pub · Row House
Cinema · Tazza D'oro · Thunderbird Café

**5x7 print ($10):** Highland Park Fountain

**Originals for sale:** Christi Pitts Park 1 ($100) · Christi Pitts Park 2 ($100)
· Trinity Bellwoods Park ($100) · West Penn Rec Center ($250)

The catch-all "5x7 in Prints (various options)" product isn't counted here: it
retires when the branch merges (CAS-61).

Sold originals with no Square item (Bananas, Heinz Ketchup, Highland Park
Fountain and Houses, Jean-Marc Chatellier, Kaibur Coffee, Kennywood, Rialto,
Rock Room, The Tunnel, Three Phase Pole, Dippy) need nothing: they're sold, so
nobody can buy them either way.

**Your call.** Say the word and I'll create the 15 in Square, matching your
naming ("Print, 8x10, <name>"), with `track_inventory` on. You'd set opening
counts. Or add them by hand, and we link them after.

## 5 things in Square the website doesn't sell

Nothing to do unless you want them online.

- **Custom Commission** ($400) — commissions go through the commissions page.
- **3 postcards (5x7)** ($25) — replaced by the automatic any-3-for-$25 deal.
- **Original - Framed - Titty Sphinx** ($150) — the parked one with water damage.
- **Print, 5x7 (8x10 Frame), Kaibur** ($40) — no framed Kaibur on the website.
- **Single Post Card variations** for Ketchup Bottle, Bryant Street Market,
  Kaibur Coffee, Biddles Escape and Mr. Smalls — you have 5x7s of these in stock
  that the website never offers. Adding them is four fields each in the Studio,
  and they'd join the any-3-for-$25 deal.

## Two mismatches to be aware of

- **Square says sold out, the website doesn't:** none. They agree today.
- **Square item names carry sizes and frames** ("Original - Framed - …"), the
  website carries the piece's title and the format separately. That's fine —
  names are never matched at checkout, only the saved id.
