import { createBrowserRouter, type RouteObject } from "react-router";

import { SiteChrome } from "@/components/layout";
import {
  CallPage,
  CallsPage,
  DashboardPage,
  KnowledgeBasePage,
  NotFoundPage,
  SchedulePage,
} from "@/features";

export const routes: RouteObject[] = [
  {
    element: <SiteChrome />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "knowledge-base", element: <KnowledgeBasePage /> },
      { path: "schedule", element: <SchedulePage /> },
      { path: "calls", element: <CallsPage /> },
      { path: "calls/:callId", element: <CallPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
