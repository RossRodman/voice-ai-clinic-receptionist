import { describe, expect, it, vi } from "vitest";
import { SupabaseCallStore } from "./supabase.ts";
import { CallStoreError } from "./types.ts";

const URL_ = "https://abcd.supabase.co/";

function setup(responses: Response[], key = "sb_secret_0123456789abcdef") {
  const fetchFn = vi.fn<typeof fetch>(
    async () => responses.shift() ?? new Response(null, { status: 201 }),
  );
  const store = new SupabaseCallStore({ url: URL_, key, fetchFn });
  const request = (i = 0) => {
    const [url, init] = fetchFn.mock.calls[i]!;
    return {
      url: new URL(String(url)),
      method: init?.method,
      headers: init?.headers as Record<string, string>,
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    };
  };
  return { store, fetchFn, request };
}

describe("SupabaseCallStore", () => {
  it("creates a call once, with snake_case columns and only the fields given", async () => {
    const { store, request } = setup([]);
    await store.openCall({
      id: "call_1",
      status: "in-progress",
      customerNumber: "+15551234567",
      startedAt: "2026-11-17T16:00:00.000Z",
    });

    const r = request();
    expect(r.url.href).toBe("https://abcd.supabase.co/rest/v1/calls");
    expect(r.method).toBe("POST");
    expect(r.headers).toMatchObject({
      apikey: "sb_secret_0123456789abcdef",
      prefer: "resolution=ignore-duplicates,return=minimal",
      "content-type": "application/json",
    });
    // The new secret keys aren't JWTs: no Authorization header.
    expect(r.headers).not.toHaveProperty("authorization");
    expect(r.body).toEqual({
      id: "call_1",
      status: "in-progress",
      customer_number: "+15551234567",
      started_at: "2026-11-17T16:00:00.000Z",
    });
  });

  it("sends a legacy service_role key as a bearer token too", async () => {
    const { store, request } = setup([], "eyJhbGciOiJIUzI1NiJ9.service_role.sig");
    await store.saveCall({ id: "call_1", outcome: "booked" });
    expect(request().headers).toMatchObject({
      apikey: "eyJhbGciOiJIUzI1NiJ9.service_role.sig",
      authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.service_role.sig",
      prefer: "resolution=merge-duplicates,return=minimal",
    });
    expect(request().body).toEqual({ id: "call_1", outcome: "booked" });
  });

  it("upserts tool calls in one request, and skips an empty list", async () => {
    const { store, fetchFn, request } = setup([]);
    await store.saveToolCalls([]);
    expect(fetchFn).not.toHaveBeenCalled();

    await store.saveToolCalls([
      { id: "tc_1", callId: "call_1", name: "check_availability", secondsFromStart: 9.1 },
    ]);
    expect(request().url.pathname).toBe("/rest/v1/tool_calls");
    expect(request().body).toEqual([
      { id: "tc_1", call_id: "call_1", name: "check_availability", seconds_from_start: 9.1 },
    ]);
  });

  it("lists calls newest first, without the transcript", async () => {
    const { store, request } = setup([
      Response.json([
        {
          id: "call_1",
          status: "ended",
          type: "inboundPhoneCall",
          customer_number: "+15551234567",
          started_at: "2026-11-17T16:00:00+00:00",
          ended_at: "2026-11-17T16:01:43+00:00",
          duration_seconds: 103,
          ended_reason: "customer-ended-call",
          outcome: "booked",
          summary: "Booked a cleaning.",
        },
      ]),
    ]);

    expect(await store.listCalls(20)).toEqual([
      {
        id: "call_1",
        status: "ended",
        type: "inboundPhoneCall",
        customerNumber: "+15551234567",
        startedAt: "2026-11-17T16:00:00+00:00",
        endedAt: "2026-11-17T16:01:43+00:00",
        durationSeconds: 103,
        endedReason: "customer-ended-call",
        outcome: "booked",
        summary: "Booked a cleaning.",
      },
    ]);
    expect(Object.fromEntries(request().url.searchParams)).toEqual({
      select:
        "id,status,type,customer_number,started_at,ended_at,duration_seconds,ended_reason,outcome,summary",
      order: "started_at.desc",
      limit: "20",
    });
  });

  it("reads one call with its tool calls and bookings", async () => {
    const { store, request } = setup([
      Response.json([
        {
          id: "call_1",
          status: "ended",
          started_at: "2026-11-17T16:00:00+00:00",
          transcript: [{ role: "caller", text: "Hi", secondsFromStart: 1 }],
          cost: "0.1342",
          tool_calls: [
            {
              id: "tc_1",
              call_id: "call_1",
              name: "search_knowledge_base",
              arguments: { query: "parking" },
              result: { found: true },
              error: null,
              duration_ms: 2,
              seconds_from_start: "4.50",
              created_at: "2026-11-17T16:00:05+00:00",
            },
          ],
          bookings: [],
        },
      ]),
      Response.json([]),
    ]);

    const call = await store.getCall("call_1");
    expect(call).toMatchObject({
      id: "call_1",
      customerNumber: null,
      cost: 0.1342,
      transcript: [{ role: "caller", text: "Hi", secondsFromStart: 1 }],
      toolCalls: [
        {
          name: "search_knowledge_base",
          arguments: { query: "parking" },
          result: { found: true },
          secondsFromStart: 4.5,
        },
      ],
      bookings: [],
    });
    expect(Object.fromEntries(request().url.searchParams)).toEqual({
      id: "eq.call_1",
      select: "*,tool_calls(*),bookings(*)",
      "tool_calls.order": "created_at.asc",
      "bookings.order": "starts_at.asc",
    });

    expect(await store.getCall("missing")).toBeNull();
  });

  it("explains failures with Supabase's message", async () => {
    const { store } = setup([
      Response.json(
        { code: "42P01", message: 'relation "public.calls" does not exist' },
        { status: 404 },
      ),
      new Response("<html>Bad gateway</html>", { status: 502, statusText: "Bad Gateway" }),
    ]);

    const error = await store.listCalls(10).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(CallStoreError);
    expect(error).toMatchObject({
      status: 404,
      message: 'Supabase 404: relation "public.calls" does not exist',
    });
    await expect(store.listCalls(10)).rejects.toThrow("Supabase 502: Bad Gateway");
  });

  it("reports a network failure", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    const store = new SupabaseCallStore({ url: URL_, key: "sb_secret_x", fetchFn });
    await expect(store.openCall({ id: "c" })).rejects.toThrow(
      "Supabase is unreachable: fetch failed",
    );
  });
});
