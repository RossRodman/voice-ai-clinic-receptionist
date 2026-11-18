import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_SECRET, testApp, toolCallsMessage } from "../test/helpers.ts";
import { NOT_FOUND_INSTRUCTION } from "../tools/searchKnowledgeBase.ts";

let app: Awaited<ReturnType<typeof testApp>>;

beforeAll(async () => {
  app = await testApp();
});
afterAll(() => app.close());

const get = (url: string) => app.inject({ method: "GET", url });

describe("GET /api/clinic", () => {
  it("returns the clinic with spoken hours and prices", async () => {
    const res = await get("/api/clinic");
    expect(res.statusCode).toBe(200);
    const clinic = res.json();
    expect(clinic.name).toBe("Brightside Dental");
    expect(clinic.hours[0]).toEqual({ days: "Monday to Thursday", hours: "8 AM to 6 PM" });
    expect(clinic).toMatchObject({ calendar: "demo", booking: { slotMinutes: 30 } });
    expect(clinic.services).toContainEqual(
      expect.objectContaining({ id: "aligner-consultation", price: "free", durationMinutes: 30 }),
    );
  });
});

describe("GET /api/availability", () => {
  it("returns what check_availability would give the assistant", async () => {
    const res = await get("/api/availability?serviceId=crown&date=2026-11-19&timeOfDay=morning");
    expect(res.statusCode).toBe(200);
    const { toolResult } = res.json();
    expect(toolResult).toMatchObject({ service: "Crown", requestedDateAvailable: true });
    expect(toolResult.slots.map((s: { spoken: string }) => s.spoken)).toEqual([
      "Thursday, November 19 at 8 AM",
      "Thursday, November 19 at 9 AM",
      "Thursday, November 19 at 10 AM",
      "Thursday, November 19 at 11:30 AM",
    ]);
  });

  it("explains bad input", async () => {
    expect((await get("/api/availability")).json()).toEqual({
      error: "serviceId Invalid input: expected string, received undefined",
    });
    const unknown = await get("/api/availability?serviceId=botox");
    expect(unknown.statusCode).toBe(400);
    expect(unknown.json().error).toMatch(/Unknown service "botox"/);
  });
});

describe("GET /api/schedule", () => {
  it("returns a week of free slots from today", async () => {
    const res = await get("/api/schedule?serviceId=root-canal");
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ calendar: "demo", today: "2026-11-17" });
    expect(body.days).toHaveLength(7);
    expect(body.days[0]).toMatchObject({
      date: "2026-11-17",
      label: "Tuesday, November 17",
      closed: false,
    });
    expect(body.days[5]).toMatchObject({ date: "2026-11-22", closed: true, slots: [] });
  });

  it("validates the range", async () => {
    expect((await get("/api/schedule?serviceId=crown&days=40")).statusCode).toBe(400);
    expect((await get("/api/schedule?serviceId=crown&from=tomorrow")).statusCode).toBe(400);
  });
});

describe("GET /api/appointments", () => {
  it("is empty until the assistant books something", async () => {
    expect((await get("/api/appointments")).json()).toEqual({ calendar: "demo", appointments: [] });
  });
});

describe("GET /api/knowledge-base", () => {
  it("lists every entry", async () => {
    const { entries } = (await get("/api/knowledge-base")).json();
    expect(entries.length).toBeGreaterThan(20);
    expect(entries).toContainEqual(expect.objectContaining({ id: "faq:languages", source: "faq" }));
  });
});

describe("GET /api/knowledge-base/search", () => {
  it("returns the hits with scores and the tool result the assistant gets", async () => {
    const body = (
      await get("/api/knowledge-base/search?q=Do%20you%20take%20Delta%20Dental")
    ).json();
    expect(body).toMatchObject({ query: "Do you take Delta Dental", found: true, coverage: 1 });
    expect(body.hits[0]).toMatchObject({ id: "insurance", title: "Insurance" });
    expect(body.hits[0].score).toBeGreaterThan(0);
    expect(body.toolResult).toEqual({
      found: true,
      answers: [{ topic: "Insurance", answer: expect.stringContaining("Delta Dental PPO") }],
    });
  });

  it("says when the answer isn't there", async () => {
    const body = (await get("/api/knowledge-base/search?q=knee%20surgery")).json();
    expect(body).toMatchObject({ found: false, hits: [] });
    expect(body.toolResult).toEqual({ found: false, instruction: NOT_FOUND_INSTRUCTION });
  });

  it("needs a question", async () => {
    expect((await get("/api/knowledge-base/search")).statusCode).toBe(400);
    expect((await get("/api/knowledge-base/search?q=%20%20")).statusCode).toBe(400);
  });
});

describe("search_knowledge_base through the Vapi webhook", () => {
  const call = (args: Record<string, unknown> | string) =>
    app.inject({
      method: "POST",
      url: "/vapi/webhook",
      headers: { "x-vapi-secret": TEST_SECRET },
      payload: toolCallsMessage([{ name: "search_knowledge_base", arguments: args }]),
    });

  it("answers with the matching entries, service ids included", async () => {
    const [result] = (await call({ query: "how much is a root canal" })).json().results;
    expect(result.toolCallId).toBe("tc_1");
    const value = JSON.parse(result.result);
    expect(value.found).toBe(true);
    expect(value.answers[0]).toMatchObject({ topic: "Root canal", serviceId: "root-canal" });
    expect(value.answers[0].answer).toContain("from $950");
  });

  it("tells the assistant not to guess", async () => {
    const [result] = (await call({ query: "do you do botox" })).json().results;
    expect(JSON.parse(result.result)).toEqual({ found: false, instruction: NOT_FOUND_INSTRUCTION });
  });

  it("asks for a query when it is missing", async () => {
    const [result] = (await call({ question: "parking" })).json().results;
    expect(result.error).toMatch(/query/);
  });
});
