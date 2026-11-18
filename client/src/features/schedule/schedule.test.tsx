import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { APPOINTMENT, AVAILABILITY, CLINIC, CLOSED_SUNDAY, SCHEDULE } from "@/test/fixtures";
import { mockApi, renderRoute } from "@/test/utils";

const BASE = {
  "GET /health": { status: "ok", uptime: 1 },
  "GET /api/clinic": CLINIC,
  "GET /api/schedule": SCHEDULE,
  "GET /api/availability": { toolResult: AVAILABILITY },
  "GET /api/appointments": { calendar: "demo", appointments: [] },
};

describe("Schedule page", () => {
  it("shows the week's free times, closed days and the calendar in use", async () => {
    mockApi(BASE);
    renderRoute("/schedule");

    expect(
      screen.getByRole("heading", { level: 1, name: "Booked while the caller is on the line." }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Demo calendar")).toBeInTheDocument();

    const tuesday = await screen.findByRole("article", { name: "Tuesday, November 17" });
    expect(within(tuesday).getByText("Today")).toBeInTheDocument();
    expect(within(tuesday).getByText("noon")).toBeInTheDocument();
    expect(within(tuesday).getByText("2 PM")).toBeInTheDocument();
    expect(
      within(screen.getByRole("article", { name: "Sunday, November 22" })).getByText("Closed"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("article", { name: "Wednesday, November 18" })).getByText(
        "Fully booked",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, el) => el?.tagName === "P" && el.textContent === "Nov 17 to Nov 23 · 4 free times",
      ),
    ).toBeInTheDocument();
    // This week is the first one.
    expect(screen.getByRole("button", { name: "Earlier" })).toBeDisabled();
  });

  it("shows the times the assistant would offer", async () => {
    mockApi(BASE);
    renderRoute("/schedule");

    const offered = await screen.findByRole("list", {
      name: "Times offered for Checkup and cleaning",
    });
    expect(within(offered).getByText("Tuesday, November 17 at noon")).toBeInTheDocument();
    expect(within(offered).getAllByText("with Hannah Lee")).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: "Show what the assistant receives" }));
    expect(screen.getByText(/"providerId": "hannah-lee"/)).toBeInTheDocument();
  });

  it("asks for a day and a time of day", async () => {
    const calls = mockApi({ ...BASE, "GET /api/availability": { toolResult: CLOSED_SUNDAY } });
    renderRoute("/schedule");

    await userEvent.click(await screen.findByRole("combobox", { name: "The caller asks for" }));
    await userEvent.click(await screen.findByRole("option", { name: "Sunday, November 22" }));
    await userEvent.click(screen.getByRole("button", { name: "Morning" }));

    expect(await screen.findByText("The clinic is closed on Sundays.")).toBeInTheDocument();
    expect(calls.map((c) => c.url)).toContain(
      "/api/availability?serviceId=checkup-cleaning&date=2026-11-22&timeOfDay=morning",
    );
  });

  it("keeps the service, dentist and week in the link", async () => {
    const calls = mockApi(BASE);
    const { router } = renderRoute("/schedule");

    await userEvent.click(await screen.findByRole("combobox", { name: "Service" }));
    await userEvent.click(await screen.findByRole("option", { name: "Root canal · 90 min" }));
    await userEvent.click(screen.getByRole("combobox", { name: "With" }));
    await userEvent.click(await screen.findByRole("option", { name: "Dr. James Okafor" }));
    await userEvent.click(screen.getByRole("button", { name: "Later" }));

    expect(router.state.location.search).toBe("?service=root-canal&with=dr-okafor&from=2026-11-24");
    expect(calls.map((c) => c.url)).toContain(
      "/api/schedule?serviceId=root-canal&days=7&from=2026-11-24&providerId=dr-okafor",
    );
  });

  it("lists the appointments the assistant booked", async () => {
    mockApi({
      ...BASE,
      "GET /api/appointments": { calendar: "demo", appointments: [APPOINTMENT] },
    });
    renderRoute("/schedule");

    const table = await screen.findByRole("table", { name: "Booked by the assistant" });
    const row = within(table).getByText("Maria Lopez").closest("tr")!;
    expect(row).toHaveTextContent("Thursday, November 19 at 8 AM");
    expect(row).toHaveTextContent("New");
    expect(row).toHaveTextContent("+15551234567");
    expect(row).toHaveTextContent("Sensitive teeth");
    expect(row).toHaveTextContent("Hannah Lee");
  });

  it("says when nothing is booked yet", async () => {
    mockApi(BASE);
    renderRoute("/schedule");
    expect(await screen.findByText(/Nothing booked yet/)).toBeInTheDocument();
  });
});
