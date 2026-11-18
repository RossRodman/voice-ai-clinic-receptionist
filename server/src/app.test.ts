import { afterEach, describe, expect, it, vi } from "vitest";
import { TEST_SECRET, testApp, toolCallsMessage } from "./test/helpers.ts";
import { ToolError, type ToolHandler, type ToolRegistry } from "./vapi/tools.ts";

type App = Awaited<ReturnType<typeof testApp>>;
let app: App | undefined;

async function start(tools: ToolRegistry = {}) {
  app = await testApp({ tools });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const webhook = (
  body: unknown,
  headers: Record<string, string> = { "x-vapi-secret": TEST_SECRET },
) => app!.inject({ method: "POST", url: "/vapi/webhook", headers, payload: body as object });

describe("GET /health", () => {
  it("is up", async () => {
    await start();
    const res = await app!.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "ok" });
  });
});

describe("POST /vapi/webhook", () => {
  it("rejects requests without the secret", async () => {
    await start();
    const res = await webhook(toolCallsMessage([{ name: "x" }]), {});
    expect(res.statusCode).toBe(401);
  });

  it("rejects a wrong secret", async () => {
    await start();
    const res = await webhook(toolCallsMessage([{ name: "x" }]), { "x-vapi-secret": "nope" });
    expect(res.statusCode).toBe(401);
  });

  it("rejects bodies that are not Vapi messages", async () => {
    await start();
    expect((await webhook({ hello: "world" })).statusCode).toBe(400);
    expect((await webhook({ message: { type: "tool-calls" } })).statusCode).toBe(400);
  });

  it("acknowledges other message types", async () => {
    await start();
    const res = await webhook({ message: { type: "status-update", status: "in-progress" } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({});
  });

  it("runs a tool with its arguments and the call", async () => {
    const echo = vi.fn<ToolHandler>(async (args) => ({ echoed: args }));
    await start({ echo });

    const res = await webhook(
      toolCallsMessage([{ id: "tc_a", name: "echo", arguments: { a: 1 } }]),
    );

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      results: [{ toolCallId: "tc_a", name: "echo", result: '{"echoed":{"a":1}}' }],
    });
    expect(echo).toHaveBeenCalledWith(
      { a: 1 },
      expect.objectContaining({ call: expect.objectContaining({ id: "call_123" }) }),
    );
  });

  it("accepts arguments sent as a JSON string, and returns strings as they are", async () => {
    await start({ greet: async (args) => `Hello, ${String(args.name)}` });
    const res = await webhook(toolCallsMessage([{ name: "greet", arguments: '{"name":"Ann"}' }]));
    expect(res.json().results[0]).toEqual({
      toolCallId: "tc_1",
      name: "greet",
      result: "Hello, Ann",
    });
  });

  it("answers every tool call, in order, even when some fail", async () => {
    await start({
      ok: async () => "fine",
      refused: async () => {
        throw new ToolError("That slot was just taken.");
      },
      broken: async () => {
        throw new Error("database password is hunter2");
      },
    });

    const res = await webhook(
      toolCallsMessage([
        { name: "ok" },
        { name: "refused" },
        { name: "broken" },
        { name: "missing" },
        { name: "ok", arguments: "{not json" },
      ]),
    );

    expect(res.statusCode).toBe(200);
    const results = res.json().results;
    expect(results.map((r: { toolCallId: string }) => r.toolCallId)).toEqual([
      "tc_1",
      "tc_2",
      "tc_3",
      "tc_4",
      "tc_5",
    ]);
    expect(results[0]).toMatchObject({ result: "fine" });
    expect(results[1]).toMatchObject({ error: "That slot was just taken." });
    // Internal errors are not leaked to the model.
    expect(results[2].error).not.toContain("hunter2");
    expect(results[2].error).toMatch(/transfer/);
    expect(results[3]).toMatchObject({ error: 'Unknown tool "missing".' });
    expect(results[4]).toMatchObject({ error: "Tool arguments are not valid JSON." });
  });

  it("does not treat Object prototype names as tools", async () => {
    await start();
    const res = await webhook(toolCallsMessage([{ name: "toString" }]));
    expect(res.json().results[0]).toMatchObject({ error: 'Unknown tool "toString".' });
  });
});
