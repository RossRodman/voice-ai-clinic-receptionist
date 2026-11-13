import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./config.ts";

const secret = "a".repeat(24);

describe("loadConfig", () => {
  it("applies defaults", () => {
    expect(loadConfig({ VAPI_SERVER_SECRET: secret })).toEqual({
      env: "development",
      host: "0.0.0.0",
      port: 3000,
      logLevel: "info",
      vapi: { serverSecret: secret },
    });
  });

  it("reads and coerces values", () => {
    const config = loadConfig({
      NODE_ENV: "production",
      PORT: "8080",
      LOG_LEVEL: "warn",
      VAPI_SERVER_SECRET: secret,
    });
    expect(config).toMatchObject({ env: "production", port: 8080, logLevel: "warn" });
  });

  it("treats empty values as unset", () => {
    expect(loadConfig({ PORT: "", VAPI_SERVER_SECRET: secret }).port).toBe(3000);
  });

  it("lists every problem at once", () => {
    const load = () => loadConfig({ PORT: "abc", VAPI_SERVER_SECRET: "short" });
    expect(load).toThrow(ConfigError);
    expect(load).toThrow(/PORT/);
    expect(load).toThrow(/VAPI_SERVER_SECRET must be at least 16 characters/);
  });

  it("requires the Vapi secret", () => {
    expect(() => loadConfig({})).toThrow(/VAPI_SERVER_SECRET is required/);
  });
});
