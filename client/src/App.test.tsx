import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { mockApi, renderRoute } from "@/test/utils";

const ONLINE = { status: "ok", uptime: 42 };

describe("App", () => {
  it("walks through how a call is handled", async () => {
    mockApi({ "GET /health": ONLINE });
    renderRoute("/");

    expect(
      screen.getByRole("heading", { level: 1, name: "Every call answered." }),
    ).toBeInTheDocument();
    for (const step of ["The call", "Questions", "Booking", "Transfer", "Call log"]) {
      expect(screen.getByRole("heading", { level: 3, name: step })).toBeInTheDocument();
    }
  });

  it("shows the server as online", async () => {
    mockApi({ "GET /health": ONLINE });
    renderRoute("/");

    expect(await screen.findByText("Server online")).toBeInTheDocument();
  });

  it("shows the server as offline when the request fails", async () => {
    mockApi({ "GET /health": new Response("Bad gateway", { status: 502 }) });
    renderRoute("/");

    expect(await screen.findByText("Server offline")).toBeInTheDocument();
  });

  it("switches between light and dark mode", async () => {
    mockApi({ "GET /health": ONLINE });
    renderRoute("/");

    await userEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
    expect(document.documentElement).toHaveAttribute("data-color-scheme", "dark");

    await userEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
    expect(document.documentElement).toHaveAttribute("data-color-scheme", "light");
  });

  it("marks the current page in the sidebar", () => {
    mockApi({ "GET /health": ONLINE });
    renderRoute("/");

    const links = screen.getAllByRole("link", { name: "Dashboard" });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toHaveClass("active");
  });

  it("has a not-found page", () => {
    mockApi({ "GET /health": ONLINE });
    renderRoute("/nowhere");

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the dashboard" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
