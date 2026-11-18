import { z } from "zod";
import { parseServiceAccount, type ServiceAccount } from "./calendar/googleAuth.ts";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  VAPI_SERVER_SECRET: z
    .string({ error: "is required (openssl rand -hex 24)" })
    .min(16, "must be at least 16 characters (openssl rand -hex 24)"),
  VAPI_API_KEY: z.string().min(10, "is too short to be a Vapi private key").optional(),
  VAPI_ASSISTANT_ID: z.uuid("must be the assistant's id from the Vapi dashboard").optional(),
  VAPI_PHONE_NUMBER_ID: z.uuid("must be the phone number's id from the Vapi dashboard").optional(),
  VAPI_MODEL: z
    .string()
    .regex(/^[\w-]+\/[\w.:-]+$/, "must be provider/model, e.g. anthropic/claude-sonnet-5-5")
    .optional(),
  PUBLIC_URL: z
    .url({ protocol: /^https$/, error: "must be the server's public https URL" })
    .optional(),
  TRANSFER_NUMBER: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, "must be a phone number in E.164 format, e.g. +15550142300")
    .optional(),
  GOOGLE_CALENDAR_ID: z.string().min(1).optional(),
  GOOGLE_SERVICE_ACCOUNT_KEY: z.string().min(1).optional(),
  SUPABASE_URL: z
    .url({ protocol: /^https?$/, error: "must be the project URL, https://<project>.supabase.co" })
    .optional(),
  SUPABASE_SECRET_KEY: z.string().min(20, "is too short to be a Supabase key").optional(),
});

export interface Config {
  env: "development" | "test" | "production";
  host: string;
  port: number;
  logLevel: z.infer<typeof envSchema>["LOG_LEVEL"];
  vapi: {
    serverSecret: string;
    apiKey?: string;
    assistantId?: string;
    phoneNumberId?: string;
    model?: string;
  };
  publicUrl?: string;
  transferNumber?: string;
  googleCalendar?: {
    calendarId: string;
    serviceAccount: ServiceAccount;
  };
  supabase?: {
    url: string;
    secretKey: string;
  };
}

export class ConfigError extends Error {
  override name = "ConfigError";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const values = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ""));
  const parsed = envSchema.safeParse(values);
  const problems = parsed.success
    ? []
    : parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`);

  let googleCalendar: Config["googleCalendar"];
  const calendarId = values.GOOGLE_CALENDAR_ID;
  const key = values.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (calendarId && !key) {
    problems.push("GOOGLE_SERVICE_ACCOUNT_KEY is required with GOOGLE_CALENDAR_ID");
  } else if (key && !calendarId) {
    problems.push("GOOGLE_CALENDAR_ID is required with GOOGLE_SERVICE_ACCOUNT_KEY");
  } else if (calendarId && key) {
    try {
      googleCalendar = { calendarId, serviceAccount: parseServiceAccount(key) };
    } catch (err) {
      problems.push(`GOOGLE_SERVICE_ACCOUNT_KEY ${(err as Error).message}`);
    }
  }

  if (values.SUPABASE_URL && !values.SUPABASE_SECRET_KEY) {
    problems.push("SUPABASE_SECRET_KEY is required with SUPABASE_URL");
  } else if (values.SUPABASE_SECRET_KEY && !values.SUPABASE_URL) {
    problems.push("SUPABASE_URL is required with SUPABASE_SECRET_KEY");
  }

  if (!parsed.success || problems.length > 0) {
    throw new ConfigError(`Invalid environment:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }

  const e = parsed.data;

  return {
    env: e.NODE_ENV,
    host: e.HOST,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    vapi: {
      serverSecret: e.VAPI_SERVER_SECRET,
      ...(e.VAPI_API_KEY ? { apiKey: e.VAPI_API_KEY } : {}),
      ...(e.VAPI_ASSISTANT_ID ? { assistantId: e.VAPI_ASSISTANT_ID } : {}),
      ...(e.VAPI_PHONE_NUMBER_ID ? { phoneNumberId: e.VAPI_PHONE_NUMBER_ID } : {}),
      ...(e.VAPI_MODEL ? { model: e.VAPI_MODEL } : {}),
    },
    ...(e.PUBLIC_URL ? { publicUrl: e.PUBLIC_URL.replace(/\/+$/, "") } : {}),
    ...(e.TRANSFER_NUMBER ? { transferNumber: e.TRANSFER_NUMBER } : {}),
    ...(googleCalendar ? { googleCalendar } : {}),
    ...(e.SUPABASE_URL && e.SUPABASE_SECRET_KEY
      ? { supabase: { url: e.SUPABASE_URL, secretKey: e.SUPABASE_SECRET_KEY } }
      : {}),
  };
}
