import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CLINIC, ENTRIES, FOUND, NOT_FOUND } from "@/test/fixtures";
import { mockApi, renderRoute } from "@/test/utils";

const BASE = {
  "GET /health": { status: "ok", uptime: 1 },
  "GET /api/clinic": CLINIC,
  "GET /api/knowledge-base": { entries: ENTRIES },
};

describe("Knowledge base page", () => {
  it("shows the clinic, its services and the FAQ", async () => {
    mockApi(BASE);
    renderRoute("/knowledge-base");

    expect(
      screen.getByRole("heading", { level: 1, name: "What the receptionist knows." }),
    ).toBeInTheDocument();

    const hours = await screen.findByRole("article", { name: "Opening hours" });
    expect(within(hours).getByText("Monday to Thursday")).toBeInTheDocument();
    expect(within(hours).getByText("8 AM to 6 PM")).toBeInTheDocument();

    const insurance = screen.getByRole("article", { name: "Insurance" });
    expect(within(insurance).getByText("Delta Dental PPO")).toBeInTheDocument();
    expect(within(insurance).getByText("Not accepted: Medicaid.")).toBeInTheDocument();

    const services = screen.getByRole("table", { name: "Services" });
    const rootCanal = within(services).getByText("Root canal").closest("tr")!;
    expect(rootCanal).toHaveTextContent("90 min");
    expect(rootCanal).toHaveTextContent("from $950");
    expect(rootCanal).toHaveTextContent("Dr. James Okafor");

    // FAQ entries only; clinic entries are shown above.
    expect(await screen.findByText("Parking and getting here")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Checkup and cleaning" })).not.toBeInTheDocument();
  });

  it("asks an example question and shows what the assistant gets", async () => {
    const calls = mockApi({ ...BASE, "GET /api/knowledge-base/search": FOUND });
    renderRoute("/knowledge-base");

    await userEvent.click(screen.getByRole("button", { name: "How much is a cleaning?" }));

    const hit = await screen.findByRole("article", { name: "Checkup and cleaning" });
    expect(within(hit).getByText("score 3.9")).toBeInTheDocument();
    expect(within(hit).getByText("checkup-cleaning")).toBeInTheDocument();
    expect(screen.getByText("price · cleaning")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Question" })).toHaveValue(
      "How much is a cleaning?",
    );
    expect(calls.map((c) => c.key)).toContain("GET /api/knowledge-base/search");

    await userEvent.click(screen.getByRole("button", { name: "Show what the assistant receives" }));
    expect(screen.getByText(/"serviceId": "checkup-cleaning"/)).toBeInTheDocument();
  });

  it("says when the question isn't in the knowledge base", async () => {
    const calls = mockApi({ ...BASE, "GET /api/knowledge-base/search": NOT_FOUND });
    renderRoute("/knowledge-base");

    expect(screen.getByRole("button", { name: "Ask" })).toBeDisabled();
    await userEvent.type(
      screen.getByRole("textbox", { name: "Question" }),
      "Do you offer botox?{Enter}",
    );

    expect(await screen.findByText(/Not in the knowledge base/)).toBeInTheDocument();
    expect(calls.map((c) => c.url)).toContain("/api/knowledge-base/search?q=Do+you+offer+botox%3F");
  });

  it("answers the question in the link", async () => {
    mockApi({ ...BASE, "GET /api/knowledge-base/search": FOUND });
    renderRoute("/knowledge-base?q=How%20much%20is%20a%20cleaning%3F");

    expect(
      await screen.findByRole("article", { name: "Checkup and cleaning" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Question" })).toHaveValue(
      "How much is a cleaning?",
    );
  });

  it("shows the server's error with a retry", async () => {
    mockApi({
      ...BASE,
      "GET /api/clinic": Response.json({ error: "Clinic data is unavailable" }, { status: 404 }),
    });
    renderRoute("/knowledge-base");

    // Both sections that read the clinic say so.
    expect(await screen.findAllByText("Clinic data is unavailable")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Retry" })).toHaveLength(2);
  });

  it("is in the sidebar", () => {
    mockApi(BASE);
    renderRoute("/knowledge-base");

    for (const link of screen.getAllByRole("link", { name: "Knowledge base" })) {
      expect(link).toHaveClass("active");
    }
  });
});
