import { describe, expect, it } from "vitest";

import { api, ApiError, describeError } from "@/api";
import { mockApi } from "@/test/utils";

describe("describeError", () => {
  it("reads the server's error message", () => {
    expect(describeError({ error: "Unauthorized" })).toBe("Unauthorized");
    expect(describeError({ message: "Route GET:/x not found" })).toBe("Route GET:/x not found");
  });

  it("ignores anything else", () => {
    expect(describeError(null)).toBeNull();
    expect(describeError({ message: 42 })).toBeNull();
    expect(describeError("oops")).toBeNull();
  });
});

describe("api", () => {
  it("returns the parsed body", async () => {
    mockApi({ "GET /health": { status: "ok", uptime: 12 } });
    await expect(api.health()).resolves.toEqual({ status: "ok", uptime: 12 });
  });

  it("throws an ApiError with the server's message", async () => {
    mockApi({
      "GET /health": Response.json({ error: "Server is starting" }, { status: 503 }),
    });
    const error = await api.health().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 503, message: "Server is starting" });
  });

  it("falls back to the method, path and status", async () => {
    mockApi({ "GET /health": new Response("Bad gateway", { status: 502 }) });
    await expect(api.health()).rejects.toThrow("GET /health failed (502)");
  });
});
