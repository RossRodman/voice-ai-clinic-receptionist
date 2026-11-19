import { createBrowserRouter, type RouteObject } from "react-router";

import { SiteChrome } from "@/components/layout";
import {
  AssistantPage,
  CallPage,
  CallsPage,
  DashboardPage,
  KnowledgeBasePage,
  NotFoundPage,
  RequireSession,
  SchedulePage,
  SignInPage,
} from "@/features";

export const routes: RouteObject[] = [
  { path: "sign-in", element: <SignInPage /> },
  {
    element: <RequireSession />,
    children: [
      {
        element: <SiteChrome />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "assistant", element: <AssistantPage /> },
          { path: "knowledge-base", element: <KnowledgeBasePage /> },
          { path: "schedule", element: <SchedulePage /> },
          { path: "calls", element: <CallsPage /> },
          { path: "calls/:callId", element: <CallPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
