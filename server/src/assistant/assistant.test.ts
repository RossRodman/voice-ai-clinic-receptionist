import { describe, expect, it } from "vitest";
import { BookingService } from "../booking/service.ts";
import { InMemoryCalendar } from "../calendar/memory.ts";
import { testClinic } from "../test/helpers.ts";
import { createTools } from "../tools/index.ts";
import { buildAssistant, DEFAULT_MODEL } from "./assistant.ts";
import { systemPrompt } from "./prompt.ts";

const data = await testClinic();
const { clinic } = data;

const options = {
  clinic,
  serverUrl: "https://receptionist.example.com",
  serverSecret: "secret-0123456789",
  transferNumber: "+15550142300",
};

type Tool = { type: string; function?: { name: string }; server?: unknown };

const tools = (assistant: ReturnType<typeof buildAssistant>) => assistant.model.tools as Tool[];

describe("buildAssistant", () => {
  it("sends Vapi's messages and every function call to the webhook, with the secret", () => {
    const assistant = buildAssistant(options);
    const server = {
      url: "https://receptionist.example.com/vapi/webhook",
      headers: { "x-vapi-secret": "secret-0123456789" },
    };

    expect(assistant.server).toEqual(server);
    expect(assistant.serverMessages).toEqual(["status-update", "end-of-call-report"]);

    for (const tool of tools(assistant).filter((t) => t.type === "function")) {
      expect(tool.server).toEqual(server);
    }
  });

  it("gives the assistant exactly the functions the server runs", () => {
    const booking = new BookingService(clinic, new InMemoryCalendar());
    const registry = createTools({ knowledgeBase: data.knowledgeBase, booking });
    const names = tools(buildAssistant(options))
      .filter((t) => t.type === "function")
      .map((t) => t.function?.name);

    expect(names.toSorted()).toEqual(Object.keys(registry).toSorted());
  });

  it("transfers to the front desk number, and can end the call", () => {
    const assistant = buildAssistant(options);

    expect(tools(assistant).map((t) => t.type)).toEqual([
      "function",
      "function",
      "function",
      "transferCall",
      "endCall",
    ]);
    expect(tools(assistant)[3]).toMatchObject({
      destinations: [{ type: "number", number: "+15550142300" }],
    });
  });

  it("leaves out the transfer without a number, and tells the assistant so", () => {
    const assistant = buildAssistant({ ...options, transferNumber: undefined });
    const prompt = assistant.model.messages[0]!.content;

    expect(tools(assistant).map((t) => t.type)).not.toContain("transferCall");
    expect(prompt).not.toContain("transferCall");
    expect(prompt).toContain("Nobody can take a transferred call right now");
  });

  it("splits the model into provider and model", () => {
    expect(buildAssistant(options).model).toMatchObject({
      provider: DEFAULT_MODEL.split("/")[0],
      model: DEFAULT_MODEL.split("/")[1],
    });
    expect(buildAssistant({ ...options, model: "openai/gpt-4.1" }).model).toMatchObject({
      provider: "openai",
      model: "gpt-4.1",
    });
  });

  it("greets callers with the clinic's name and keeps Vapi's name limit", () => {
    const assistant = buildAssistant(options);

    expect(assistant.firstMessage).toMatch(/^Thank you for calling Brightside Dental/);
    expect(assistant.name).toBe("Brightside Dental receptionist");
    expect(
      buildAssistant({ ...options, clinic: { ...clinic, name: "A".repeat(60) } }).name,
    ).toHaveLength(40);
  });

  it("helps the transcriber with names callers say", () => {
    expect(buildAssistant(options).transcriber.keyterm).toEqual(
      expect.arrayContaining(["Brightside Dental", "Okafor", "Ramirez", "Delta Dental PPO"]),
    );
  });
});

describe("systemPrompt", () => {
  const prompt = systemPrompt(clinic, { canTransfer: true });

  it("gives the facts that never change during a call", () => {
    expect(prompt).toContain("Monday to Thursday: 8 AM to 6 PM");
    expect(prompt).toContain("Sunday: closed");
    expect(prompt).toContain("214 Maple Avenue");
    expect(prompt).toContain("Dr. James Okafor");
  });

  it("names every function it tells the assistant to call", () => {
    for (const name of [
      "search_knowledge_base",
      "check_availability",
      "book_appointment",
      "transferCall",
      "endCall",
    ]) {
      expect(prompt).toContain(name);
    }
  });

  it("leaves prices and policies to the knowledge base", () => {
    expect(prompt).not.toMatch(/\$\d/);
    expect(prompt).toContain("Never answer from memory");
  });
});
