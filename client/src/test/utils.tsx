import { render } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { vi } from "vitest";

import { App } from "@/App";
import { createQueryClient } from "@/app/queryClient";
import { routes } from "@/app/router";
import { queryKeys } from "@/constants";
import type { Session } from "@/types";

export const OPEN_SESSION: Session = { required: false, signedIn: true };

/** `session: null` leaves the session to the mocked GET /api/session. */
export function renderRoute(path: string, { session = OPEN_SESSION as Session | null } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = createQueryClient();

  if (session) {
    queryClient.setQueryData(queryKeys.session, session);
  }

  render(<App router={router} queryClient={queryClient} />);

  return { router, queryClient };
}

type Handler = (body: unknown) => unknown;

export function mockApi(routes: Record<string, Handler | unknown>) {
  const handlers: Record<string, Handler | unknown> = {
    "GET /api/session": OPEN_SESSION,
    ...routes,
  };
  const calls: { key: string; url: string; body: unknown }[] = [];

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(String(input), "http://localhost");
    const key = `${init?.method ?? "GET"} ${url.pathname}`;
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body;
    calls.push({ key, url: url.pathname + url.search, body });

    if (!(key in handlers)) {
      return Response.json({ message: `unmocked ${key}` }, { status: 404 });
    }

    const handler = handlers[key];
    const result = typeof handler === "function" ? (handler as Handler)(body) : handler;

    return result instanceof Response ? result : Response.json(result);
  });

  return calls;
}
