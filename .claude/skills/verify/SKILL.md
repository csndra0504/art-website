---
name: verify
description: Verify a change to the cass-art site before calling it done — typecheck, lint, production build, and a browser pass. Use after finishing any code change, and always before ticking a task in a TASKS.md file.
---

# Verify

There is **no test suite** in this repo. These checks are the whole safety net, so
run all of them and report failures honestly. A change that compiles is not a
change that works.

## 1. Static checks

Run in order, stop at the first failure and fix it:

```bash
npx tsc -b --noEmit    # typecheck — fastest signal
npm run lint           # eslint
npm run build          # tsc + vite-react-ssg prerender + sitemap
```

The build is not redundant with the typecheck: `vite-react-ssg` renders every
route to static HTML, so it catches code that touches `window`, `localStorage`,
or `document` at module scope or during render. That class of bug **only** shows
up here.

## 2. Browser pass

Required for any UI change. Use the chrome-devtools MCP tools.

```bash
npm run dev:app   # background, port 5173
```

Then:
- Navigate to the routes you touched.
- `list_console_messages` — no new errors or warnings.
- Resize to **375px** and check the change is usable on mobile. This site's
  traffic is phone-heavy; a desktop-only check is not a check.
- For anything involving cart state: reload the page and confirm state survives.

## 3. Report

State plainly what passed, what failed, and what you did **not** check. If you
skipped the browser pass, say so — don't imply coverage you don't have.

Never tick a task in `TASKS.md` on the strength of a typecheck alone.
