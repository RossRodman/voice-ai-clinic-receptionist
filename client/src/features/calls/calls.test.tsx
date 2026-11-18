import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CALL, CALL_SUMMARY, CLINIC, LIVE_CALL } from "@/test/fixtures";
import { mockApi, renderRoute } from "@/test/utils";

import { callTime, clock } from "./format";

const BASE = {
  "GET /health": { status: "ok", uptime: 1 },
  "GET /api/clinic": CLINIC,
  "GET /api/calls": { callLog: "memory", calls: [LIVE_CALL, CALL_SUMMARY] },
  "GET /api/calls/call_1": { callLog: "memory", call: CALL },
};

describe("Calls page", () => {
  it("lists the calls with their outcome, and where they are stored", async () => {
    mockApi(BASE);
    renderRoute("/calls");

    expect(
      screen.getByRole("heading", { level: 1, name: "Every call, and what came of it." }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Call log in memory")).toBeInTheDocument();

    const list = await screen.findByRole("list", { name: "Calls" });
    const [live, booked] = within(list).getAllByRole("link");
    expect(live).toHaveTextContent("+15559876543");
    expect(live).toHaveTextContent("Live");
    expect(booked).toHaveTextContent("Booked");
    expect(booked).toHaveTextContent("1:43");
    expect(booked).toHaveTextContent("Maria Lopez booked a checkup");
    expect(booked).toHaveAttribute("href", "/calls/call_1");
  });

  it("says how to try it when there are no calls", async () => {
    mockApi({ ...BASE, "GET /api/calls": { callLog: "supabase", calls: [] } });
    renderRoute("/calls");

    expect(await screen.findByText("No calls yet.")).toBeInTheDocument();
    expect(screen.getByText("npm run demo:call")).toBeInTheDocument();
    expect(screen.getByText("Supabase")).toBeInTheDocument();
  });
});

describe("Call page", () => {
  it("shows the conversation with the functions run in it, in order", async () => {
    mockApi(BASE);
    renderRoute("/calls/call_1");

    const conversation = await screen.findByRole("list", { name: "Conversation" });
    const items = within(conversation).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining("Thanks for calling Brightside Dental."),
      expect.stringContaining("I'd like a cleaning, please."),
      expect.stringContaining("Checked free times"),
      expect.stringContaining("I have Thursday at 8 AM."),
      expect.stringContaining("Booked an appointment"),
    ]);
    expect(items[2]).toHaveTextContent("check_availability · 0:09 · 3 ms");
    expect(items[4]).toHaveTextContent("0:20");
    expect(within(items[4]!).getByText("Error")).toBeInTheDocument();

    await userEvent.click(within(items[2]!).getByRole("button", { name: "Details" }));
    expect(within(items[2]!).getByText(/"serviceId": "checkup-cleaning"/)).toBeInTheDocument();
    expect(within(items[2]!).getByText(/"service": "Checkup and cleaning"/)).toBeInTheDocument();
  });

  it("shows the summary, the booking, the recording and the details", async () => {
    mockApi(BASE);
    renderRoute("/calls/call_1");

    expect(await screen.findByRole("heading", { level: 1, name: "+15551234567" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Summary" })).toHaveTextContent(
      "Maria Lopez booked a checkup and cleaning",
    );
    const booking = screen.getByRole("region", { name: "Appointment booked" });
    expect(booking).toHaveTextContent("Thursday, November 19 at 8:00 AM");
    expect(booking).toHaveTextContent("with Hannah Lee");
    expect(booking).toHaveTextContent("New");
    expect(screen.getByLabelText("Call recording")).toHaveAttribute(
      "src",
      "https://storage.vapi.ai/call_1-mono.wav",
    );
    const details = screen.getByRole("region", { name: "Details" });
    expect(details).toHaveTextContent("customer-ended-call");
    expect(details).toHaveTextContent("$0.1342");
  });

  it("says when the call isn't there", async () => {
    mockApi({
      ...BASE,
      "GET /api/calls/nope": Response.json(
        { error: "There is no call with this id." },
        { status: 404 },
      ),
    });
    renderRoute("/calls/nope");
    expect(await screen.findByText("There is no call with this id.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All calls" })).toHaveAttribute("href", "/calls");
  });
});

describe("format", () => {
  it("writes durations like a clock", () => {
    expect([clock(0), clock(42.7), clock(103), clock(3725)]).toEqual([
      "0:00",
      "0:42",
      "1:43",
      "1:02:05",
    ]);
  });

  it("says today and yesterday in the clinic's time zone", () => {
    const now = new Date("2026-11-18T04:30:00Z"); // 10:30 PM on Nov 17 in Chicago
    expect(callTime("2026-11-18T03:00:00Z", "America/Chicago", now)).toBe("Today, 9:00 PM");
    expect(callTime("2026-11-17T03:00:00Z", "America/Chicago", now)).toBe("Yesterday, 9:00 PM");
    expect(callTime("2026-11-14T15:00:00Z", "America/Chicago", now)).toBe("Sat, Nov 14, 9:00 AM");
  });
});
