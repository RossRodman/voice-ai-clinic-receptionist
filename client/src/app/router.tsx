import { createBrowserRouter, type RouteObject } from "react-router";

import { SiteChrome } from "@/components/layout";
import { DashboardPage, KnowledgeBasePage, NotFoundPage, SchedulePage } from "@/features";

export const routes: RouteObject[] = [
  {
    element: <SiteChrome />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "knowledge-base", element: <KnowledgeBasePage /> },
      { path: "schedule", element: <SchedulePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
