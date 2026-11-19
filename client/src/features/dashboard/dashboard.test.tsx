import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { STATS } from "@/test/fixtures";
import { mockApi, renderRoute } from "@/test/utils";

const BASE = {
  "GET /health": { status: "ok", uptime: 1 },
  "GET /api/stats": STATS,
};

describe("Dashboard overview", () => {
  it("shows the totals for the last 7 days", async () => {
    mockApi(BASE);
    renderRoute("/");

    const overview = await screen.findByRole("region", { name: "Overview" });
    const tiles = await within(overview).findAllByRole("definition");
    expect(tiles.map((t) => t.textContent)).toEqual(["12", "50%", "1:35", "2"]);
  });

  it("charts calls per day, with a table for screen readers", async () => {
    mockApi(BASE);
    renderRoute("/");

    expect(await screen.findAllByTestId("day-bar")).toHaveLength(7);
    const table = screen.getByRole("table", { name: "Calls per day" });
    expect(within(table).getByRole("row", { name: "Mon, Nov 16 4 2" })).toBeInTheDocument();
  });

  it("links each outcome to the filtered call log", async () => {
    mockApi(BASE);
    renderRoute("/");

    const booked = await screen.findByRole("link", { name: "Booked: 5" });
    expect(booked).toHaveAttribute("href", "/calls?outcome=booked&from=2026-11-11&to=2026-11-17");
    expect(screen.queryByRole("link", { name: /^Live/ })).not.toBeInTheDocument();
  });

  it("switches to the last 30 days", async () => {
    const requests = mockApi(BASE);
    renderRoute("/");

    await userEvent.click(await screen.findByRole("button", { name: "30 days" }));

    expect(requests.map((r) => r.url)).toContain("/api/stats?days=30");
  });
});
