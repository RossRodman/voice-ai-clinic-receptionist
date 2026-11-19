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

  it("reads the Front Desk password, 8 characters or more", () => {
    expect(
      loadConfig({ VAPI_SERVER_SECRET: secret, FRONT_DESK_PASSWORD: "brightside" }),
    ).toMatchObject({ frontDeskPassword: "brightside" });
    expect(() => loadConfig({ VAPI_SERVER_SECRET: secret, FRONT_DESK_PASSWORD: "short" })).toThrow(
      /FRONT_DESK_PASSWORD must be at least 8 characters/,
    );
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

  describe("Google Calendar", () => {
    const key = JSON.stringify({
      client_email: "receptionist@demo.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
    });

    it("is off without settings: the demo calendar", () => {
      expect(loadConfig({ VAPI_SERVER_SECRET: secret }).googleCalendar).toBeUndefined();
    });

    it("reads the calendar id and the key, as JSON or base64", () => {
      for (const value of [key, Buffer.from(key).toString("base64")]) {
        const config = loadConfig({
          VAPI_SERVER_SECRET: secret,
          GOOGLE_CALENDAR_ID: "clinic@group.calendar.google.com",
          GOOGLE_SERVICE_ACCOUNT_KEY: value,
        });
        expect(config.googleCalendar).toMatchObject({
          calendarId: "clinic@group.calendar.google.com",
          serviceAccount: {
            client_email: "receptionist@demo.iam.gserviceaccount.com",
            token_uri: "https://oauth2.googleapis.com/token",
          },
        });
      }
    });

    it("needs both settings", () => {
      expect(() => loadConfig({ VAPI_SERVER_SECRET: secret, GOOGLE_CALENDAR_ID: "c" })).toThrow(
        /GOOGLE_SERVICE_ACCOUNT_KEY is required with GOOGLE_CALENDAR_ID/,
      );
      expect(() =>
        loadConfig({ VAPI_SERVER_SECRET: secret, GOOGLE_SERVICE_ACCOUNT_KEY: key }),
      ).toThrow(/GOOGLE_CALENDAR_ID is required/);
    });

    it("rejects a key that isn't one, along with other problems", () => {
      const load = () =>
        loadConfig({ PORT: "abc", GOOGLE_CALENDAR_ID: "c", GOOGLE_SERVICE_ACCOUNT_KEY: "{oops" });
      expect(load).toThrow(/GOOGLE_SERVICE_ACCOUNT_KEY is neither the key's JSON/);
      expect(load).toThrow(/PORT/);
      expect(load).toThrow(/VAPI_SERVER_SECRET/);
    });
  });

  describe("Supabase", () => {
    const supabase = {
      SUPABASE_URL: "https://abcd.supabase.co",
      SUPABASE_SECRET_KEY: "sb_secret_0123456789abcdef",
    };

    it("is off without settings: the call log in memory", () => {
      expect(loadConfig({ VAPI_SERVER_SECRET: secret }).supabase).toBeUndefined();
    });

    it("reads the project URL and the key", () => {
      expect(loadConfig({ VAPI_SERVER_SECRET: secret, ...supabase }).supabase).toEqual({
        url: "https://abcd.supabase.co",
        secretKey: "sb_secret_0123456789abcdef",
      });
    });

    it("needs both settings, and a URL", () => {
      expect(() =>
        loadConfig({ VAPI_SERVER_SECRET: secret, SUPABASE_URL: supabase.SUPABASE_URL }),
      ).toThrow(/SUPABASE_SECRET_KEY is required with SUPABASE_URL/);
      expect(() =>
        loadConfig({
          VAPI_SERVER_SECRET: secret,
          SUPABASE_SECRET_KEY: supabase.SUPABASE_SECRET_KEY,
        }),
      ).toThrow(/SUPABASE_URL is required/);
      expect(() =>
        loadConfig({ VAPI_SERVER_SECRET: secret, ...supabase, SUPABASE_URL: "abcd.supabase.co" }),
      ).toThrow(/SUPABASE_URL must be the project URL/);
    });
  });

  describe("the Vapi assistant", () => {
    const assistant = {
      VAPI_SERVER_SECRET: secret,
      VAPI_API_KEY: "0f6c3a1e-private-key",
      VAPI_ASSISTANT_ID: "4b8f2c1a-9d3e-4f5a-8b7c-1d2e3f4a5b6c",
      VAPI_PHONE_NUMBER_ID: "7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f",
      VAPI_MODEL: "openai/gpt-4.1",
      PUBLIC_URL: "https://receptionist.example.com/",
      TRANSFER_NUMBER: "+15550142300",
    };

    it("reads the settings, without the trailing slash of the URL", () => {
      const config = loadConfig(assistant);

      expect(config.vapi).toEqual({
        serverSecret: secret,
        apiKey: "0f6c3a1e-private-key",
        assistantId: "4b8f2c1a-9d3e-4f5a-8b7c-1d2e3f4a5b6c",
        phoneNumberId: "7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f",
        model: "openai/gpt-4.1",
      });
      expect(config.publicUrl).toBe("https://receptionist.example.com");
      expect(config.transferNumber).toBe("+15550142300");
    });

    it("explains values that can't work", () => {
      const load = () =>
        loadConfig({
          ...assistant,
          VAPI_ASSISTANT_ID: "my-assistant",
          VAPI_MODEL: "gpt-4.1",
          PUBLIC_URL: "http://localhost:3000",
          TRANSFER_NUMBER: "(555) 014-2300",
        });

      expect(load).toThrow(/VAPI_ASSISTANT_ID must be the assistant's id/);
      expect(load).toThrow(/VAPI_MODEL must be provider\/model/);
      expect(load).toThrow(/PUBLIC_URL must be the server's public https URL/);
      expect(load).toThrow(/TRANSFER_NUMBER must be a phone number in E.164 format/);
    });
  });

  it("requires the Vapi secret", () => {
    expect(() => loadConfig({})).toThrow(/VAPI_SERVER_SECRET is required/);
  });
});
