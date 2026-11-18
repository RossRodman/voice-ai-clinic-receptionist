import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ASSISTANT, CLINIC } from "@/test/fixtures";
import { mockApi, renderRoute } from "@/test/utils";

const BASE = {
  "GET /health": { status: "ok", uptime: 1 },
  "GET /api/clinic": CLINIC,
  "GET /api/assistant": ASSISTANT,
};

describe("Assistant page", () => {
  it("shows which setup steps are done and what to do next", async () => {
    mockApi(BASE);
    renderRoute("/assistant");

    expect(
      screen.getByRole("heading", { level: 1, name: "The voice that answers the phone." }),
    ).toBeInTheDocument();

    const setup = await screen.findByRole("list", { name: "Setup" });
    const [url, key, transfer, assistant, phone] = within(setup).getAllByRole("listitem");

    expect(url).toHaveTextContent("https://receptionist.example.com/vapi/webhook");
    expect(within(url!).getByTitle("Done")).toBeInTheDocument();
    expect(key).toHaveTextContent("Set. It stays on the server.");
    expect(transfer).toHaveTextContent("+15550142300");
    expect(within(assistant!).getByTitle("To do")).toBeInTheDocument();
    expect(assistant).toHaveTextContent("Run npm run assistant:sync");
    expect(phone).toHaveTextContent("VAPI_PHONE_NUMBER_ID");
    expect(screen.getByText(/3 of 5 done/)).toBeInTheDocument();
  });

  it("links to the assistant in Vapi once it exists", async () => {
    const id = "4b8f2c1a-9d3e-4f5a-8b7c-1d2e3f4a5b6c";

    mockApi({
      ...BASE,
      "GET /api/assistant": { ...ASSISTANT, setup: { ...ASSISTANT.setup, assistantId: id } },
    });
    renderRoute("/assistant");

    expect(await screen.findByRole("link", { name: id })).toHaveAttribute(
      "href",
      `https://dashboard.vapi.ai/assistants/${id}`,
    );
  });

  it("shows the prompt, the voice and every function", async () => {
    mockApi(BASE);
    renderRoute("/assistant");

    expect(await screen.findByLabelText("Prompt text")).toHaveTextContent(
      "You are Ava, the virtual receptionist at Brightside Dental.",
    );
    expect(screen.getByText(/this is Ava, the virtual assistant/)).toBeInTheDocument();
    expect(screen.getByText("anthropic/claude-sonnet-5-5")).toBeInTheDocument();
    expect(screen.getByText("vapi · Savannah")).toBeInTheDocument();

    const functions = screen.getByRole("list", { name: "Functions" });
    const check = within(functions).getByRole("listitem", { name: "check_availability" });

    expect(check).toHaveTextContent("Runs on this server");
    expect(check).toHaveTextContent(
      "While it runs, the assistant says “Let me check the schedule.”",
    );
    expect(within(check).getByRole("list", { name: "Parameters" })).toHaveTextContent(
      "serviceIdstring, required",
    );
    expect(check).toHaveTextContent("One of morning, afternoon, any");
    expect(within(functions).getByRole("listitem", { name: "transferCall" })).toHaveTextContent(
      "Puts the caller through to The front desk at Brightside Dental, +15550142300",
    );
    expect(within(functions).getByRole("listitem", { name: "endCall" })).toHaveTextContent(
      "Built into Vapi",
    );
  });

  it("copies the prompt", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");

    mockApi(BASE);
    renderRoute("/assistant");

    await user.click(await screen.findByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledWith(ASSISTANT.assistant.model.messages[0]!.content);
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });
});
