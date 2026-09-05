# Cass Art — project conventions

Portfolio + storefront for Cassandra Wilcox. Read this before making changes.

## Stack

- **React 19 + TypeScript + Vite**, prerendered to static HTML by `vite-react-ssg`.
- **Mantine v8** for UI. **No Tailwind, no CSS-in-JS libs.**
- **Sanity CMS** (`studio/`) is the source of truth for artwork content and pricing.
- **PostHog** for analytics (`src/lib/analytics.ts`), **Brevo** for email (`src/lib/brevo.ts`).
- **Deploy:** merge to `main` → GitHub Actions builds a Docker image → SSH to a
  DigitalOcean droplet → nginx serves the static build. Studio deploys to Sanity's host.

## Commands

```bash
npm run dev        # app (5173) + studio (3333)
npm run dev:app    # app only
npm run build      # tsc -b && vite-react-ssg build && sitemap
npm run lint       # eslint
npx tsc -b --noEmit  # typecheck alone (fastest feedback)
```

There is **no test suite**. Verification is typecheck + lint + build + a manual
browser pass. Do not claim something works because it compiled.

## Architecture facts that constrain changes

- **The site is fully static.** There is no application server today. Anything
  needing a secret (Stripe, Sanity write token) must live in a separate service —
  see [docs/cart-checkout/PRD.md](docs/cart-checkout/PRD.md).
- Routes live in [src/App.tsx](src/App.tsx). Each page exports `Component` and
  optionally `loader`. Dynamic routes need `getStaticPaths` to be prerendered.
- Pages seed from build-time loader data, then **refetch on the client** so
  pricing and sold status are fresh without a rebuild. Preserve this pattern —
  a page must render correctly with no loader data (a piece published since the
  last build).
- `nginx.conf` matches `$uri/index.html`, never `$uri/`. Changing this breaks
  canonical URLs and leaks the internal port behind the proxy.
- Sanity schema changes go in `studio/schemaTypes/`, and the matching TS types in
  `src/types/`. One-off content edits use scripts in `studio/scripts/` (see
  existing examples for the `@sanity/client` + CLI-token pattern).

## Code style

- Match the surrounding file. Mantine components with `radius={0}` — the design
  language is square corners, hairline `#e8e8e0` borders, `#fafaf8` fills.
- Comments explain **why**, not what. The existing codebase does this well; keep it.
- No new dependencies without asking.
- Never fabricate customer-facing content (testimonials, reviews, counts).

## Working agreements

- Small, reviewable commits. One task from `TASKS.md` per commit where possible.
- Never commit or push unless asked.
- Secrets go in `.env` (gitignored) and GitHub Actions secrets. Never inline a key.
- When a task is done, tick it in the relevant `docs/*/TASKS.md` and note anything
  surprising in that file's **Notes** section.
