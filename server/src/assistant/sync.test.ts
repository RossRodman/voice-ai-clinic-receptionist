import { describe, expect, it, vi } from "vitest";
import { testClinic } from "../test/helpers.ts";
import { buildAssistant } from "./assistant.ts";
import { syncAssistant } from "./sync.ts";
import { VapiApi, VapiApiError } from "./vapiApi.ts";

const { clinic } = await testClinic();

const assistant = buildAssistant({
  clinic,
  serverUrl: "https://receptionist.example.com",
  serverSecret: "secret-0123456789",
});

const ASSISTANT_ID = "4b8f2c1a-9d3e-4f5a-8b7c-1d2e3f4a5b6c";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function setup(responses: Response[]) {
  const fetchFn = vi.fn<typeof fetch>(async () => responses.shift() ?? json({}));
  const api = new VapiApi({ apiKey: "private-key-123", fetchFn });

  const requests = () =>
    fetchFn.mock.calls.map(([url, init]) => ({
      method: init?.method,
      url: String(url),
      headers: init?.headers as Record<string, string>,
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    }));

  return { api, requests };
}

describe("VapiApi", () => {
  it("authenticates with the private key and sends JSON", async () => {
    const { api, requests } = setup([json({ id: ASSISTANT_ID })]);

    await api.createAssistant({ name: "Test" });

    expect(requests()[0]).toEqual({
      method: "POST",
      url: "https://api.vapi.ai/assistant",
      headers: { authorization: "Bearer private-key-123", "content-type": "application/json" },
      body: { name: "Test" },
    });
  });

  it("explains Vapi's errors", async () => {
    const { api } = setup([
      json({ message: ["model.model must be one of …", "voice.voiceId is invalid"] }, 400),
      new Response("Bad gateway", { status: 502, statusText: "Bad Gateway" }),
    ]);

    await expect(api.listAssistants()).rejects.toThrow(
      "Vapi 400: model.model must be one of …; voice.voiceId is invalid",
    );
    await expect(api.listAssistants()).rejects.toThrow("Vapi 502: Bad Gateway");
  });

  it("says when Vapi can't be reached", async () => {
    const api = new VapiApi({
      apiKey: "private-key-123",
      fetchFn: async () => {
        throw new TypeError("fetch failed");
      },
    });

    await expect(api.listAssistants()).rejects.toThrow("Vapi is unreachable: fetch failed");
  });
});

describe("syncAssistant", () => {
  it("creates the assistant when there is none with its name", async () => {
    const { api, requests } = setup([
      json([{ id: "other", name: "Sales bot" }]),
      json({ id: ASSISTANT_ID }),
    ]);

    expect(await syncAssistant(api, assistant)).toEqual({
      action: "created",
      assistantId: ASSISTANT_ID,
    });
    expect(requests().map((r) => `${r.method} ${r.url}`)).toEqual([
      "GET https://api.vapi.ai/assistant?limit=1000",
      "POST https://api.vapi.ai/assistant",
    ]);
    expect(requests()[1]!.body.name).toBe("Brightside Dental receptionist");
  });

  it("updates the one with the same name instead of making another", async () => {
    const { api, requests } = setup([
      json([{ id: ASSISTANT_ID, name: "Brightside Dental receptionist" }]),
      json({ id: ASSISTANT_ID }),
    ]);

    expect(await syncAssistant(api, assistant)).toEqual({
      action: "updated",
      assistantId: ASSISTANT_ID,
    });
    expect(requests()[1]!.method).toBe("PATCH");
    expect(requests()[1]!.url).toBe(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`);
  });

  it("updates the assistant by id, and puts it on the phone number", async () => {
    const { api, requests } = setup([
      json({ id: ASSISTANT_ID }),
      json({ id: "phone-1", number: "+15550142300", assistantId: ASSISTANT_ID }),
    ]);

    const result = await syncAssistant(api, assistant, {
      assistantId: ASSISTANT_ID,
      phoneNumberId: "phone-1",
    });

    expect(result).toEqual({
      action: "updated",
      assistantId: ASSISTANT_ID,
      phoneNumber: "+15550142300",
    });
    expect(requests().map((r) => `${r.method} ${r.url}`)).toEqual([
      `PATCH https://api.vapi.ai/assistant/${ASSISTANT_ID}`,
      "PATCH https://api.vapi.ai/phone-number/phone-1",
    ]);
    expect(requests()[1]!.body).toEqual({ assistantId: ASSISTANT_ID });
  });

  it("says what to do when the assistant id is wrong", async () => {
    const { api } = setup([json({ message: "Not Found" }, 404)]);
    const sync = syncAssistant(api, assistant, { assistantId: ASSISTANT_ID });

    await expect(sync).rejects.toThrow(VapiApiError);
    await expect(sync).rejects.toThrow(/Check VAPI_ASSISTANT_ID, or remove it/);
  });
});
