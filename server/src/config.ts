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
  };
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
    vapi: { serverSecret: e.VAPI_SERVER_SECRET },
    ...(googleCalendar ? { googleCalendar } : {}),
    ...(e.SUPABASE_URL && e.SUPABASE_SECRET_KEY
      ? { supabase: { url: e.SUPABASE_URL, secretKey: e.SUPABASE_SECRET_KEY } }
      : {}),
  };
}
