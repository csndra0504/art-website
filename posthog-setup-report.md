# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into the cass-art React + Vite project. PostHog is initialized in `src/main.tsx` alongside the existing Mantine provider. The app is wrapped with `PostHogProvider` (for hook access throughout the component tree) and `PostHogErrorBoundary` (for automatic unhandled React error capture). Eight business events are now captured via PostHog, complementing the existing Google Analytics 4 integration — both systems run in parallel with no GA4 code removed or altered.

| Event name | Description | File |
|---|---|---|
| `artwork_viewed` | Fired when an artwork detail page loads with artwork data, marking entry into the purchase funnel. | `src/lib/analytics.ts` |
| `checkout_started` | Fired when a user clicks a buy button (card, Venmo, or Etsy) on an artwork detail page. | `src/lib/analytics.ts` |
| `print_requested` | Fired when a user signals interest in a print for an artwork that has no print available. | `src/lib/analytics.ts` |
| `commission_inquiry_started` | Fired when a user clicks to open the commission inquiry form. | `src/lib/analytics.ts` |
| `email_signup_submitted` | Fired when a user successfully submits the email signup form (banner or inline). | `src/lib/analytics.ts` |
| `gallery_filter_applied` | Fired when a user applies a tag or for-sale filter on the homepage gallery. | `src/pages/Home.tsx` |
| `hero_cta_clicked` | Fired when a user clicks a hero call-to-action button on the homepage. | `src/pages/Home.tsx` |
| `event_link_clicked` | Fired when a user clicks the external link for an upcoming or past event. | `src/pages/Events.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard**: [Analytics basics (wizard)](https://us.posthog.com/project/523020/dashboard/1885913)
- **Insight**: [Purchase funnel: viewed → checkout](https://us.posthog.com/project/523020/insights/4MBHKbPf)
- **Insight**: [Checkouts by payment method](https://us.posthog.com/project/523020/insights/sqDPJowk)
- **Insight**: [Email signups over time](https://us.posthog.com/project/523020/insights/yhTxAjNy)
- **Insight**: [Commission inquiries over time](https://us.posthog.com/project/523020/insights/MZCixUAS)
- **Insight**: [Print demand signals by artwork](https://us.posthog.com/project/523020/insights/4gYCNKr6)

## Verify before merging

- [ ] Run a full production build (`npm run build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `VITE_POSTHOG_PROJECT_TOKEN` and `VITE_POSTHOG_HOST` to `.env.example` and any onboarding docs so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or `vite-plugin-sentry`/equivalent) into CI so production stack traces de-minify in PostHog error tracking.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-react-react-router-7-declarative/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
