import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CLINIC } from "@/test/fixtures";
import { mockApi, renderRoute } from "@/test/utils";

import { safeNext } from "./next";

const LOCKED = { required: true, signedIn: false };
const SIGNED_IN = { required: true, signedIn: true };

const BASE = {
  "GET /health": { status: "ok", uptime: 1 },
  "GET /api/clinic": CLINIC,
  "GET /api/calls": { callLog: "memory", calls: [] },
};

describe("Sign-in", () => {
  it("sends a signed-out visitor to sign in, then back where they were going", async () => {
    let signedIn = false;
    const requests = mockApi({
      ...BASE,
      "GET /api/session": () => (signedIn ? SIGNED_IN : LOCKED),
      "POST /api/session": () => {
        signedIn = true;

        return new Response(null, { status: 204 });
      },
    });
    const { router } = renderRoute("/calls?outcome=booked", { session: null });

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/sign-in");

    await userEvent.type(screen.getByLabelText(/Password/), "brightside-front-desk");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Every call, and what came of it." }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe("?outcome=booked");
    expect(requests).toContainEqual(
      expect.objectContaining({
        key: "POST /api/session",
        body: { password: "brightside-front-desk" },
      }),
    );
  });

  it("says when the password is wrong", async () => {
    mockApi({
      ...BASE,
      "POST /api/session": Response.json({ error: "That password isn't right." }, { status: 401 }),
    });
    renderRoute("/sign-in", { session: LOCKED });

    await userEvent.type(screen.getByLabelText(/Password/), "nope-nope");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("That password isn't right.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/)).toHaveValue("");
  });

  it("skips the sign-in page when there is no password", async () => {
    mockApi(BASE);
    const { router } = renderRoute("/sign-in");

    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("signs out from the header", async () => {
    const requests = mockApi({
      ...BASE,
      "DELETE /api/session": new Response(null, { status: 204 }),
      "GET /api/session": LOCKED,
    });
    const { router } = renderRoute("/calls", { session: SIGNED_IN });

    await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/sign-in");
    expect(requests.map((r) => r.key)).toContain("DELETE /api/session");
  });

  it("goes back to sign-in when the session runs out", async () => {
    mockApi({
      ...BASE,
      "GET /api/calls": Response.json({ error: "Sign in to Front Desk first." }, { status: 401 }),
    });
    renderRoute("/calls", { session: SIGNED_IN });

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("only returns to pages inside Front Desk", () => {
    expect(safeNext("/calls?outcome=booked")).toBe("/calls?outcome=booked");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/sign-in")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});
