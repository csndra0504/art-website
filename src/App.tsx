import type { RouteRecord } from "vite-react-ssg";
import { RootLayout } from "./components/RootLayout";
import { getArtworkSlugs } from "./lib/queries";

// Route table consumed by vite-react-ssg. Pages are code-split via `lazy` and
// export their own `Component` + `loader` (see each page file). The root route
// renders RootLayout (providers + AppShell) with the page in its Outlet.
export const routes: RouteRecord[] = [
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, lazy: () => import("./pages/Home") },
      {
        path: "artwork/:slug",
        lazy: () => import("./pages/ArtworkDetail"),
        // Enumerate every artwork page to prerender at build time.
        getStaticPaths: async () =>
          (await getArtworkSlugs()).map((slug) => `/artwork/${slug}`),
      },
      { path: "events", lazy: () => import("./pages/Events") },
      { path: "commissions", lazy: () => import("./pages/Commissions") },
      { path: "subscribe", lazy: () => import("./pages/Subscribe") },
      { path: "raffle", lazy: () => import("./pages/Raffle") },
    ],
  },
];
