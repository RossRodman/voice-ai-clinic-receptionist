import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  VAPI_SERVER_SECRET: z
    .string({ error: "is required (openssl rand -hex 24)" })
    .min(16, "must be at least 16 characters (openssl rand -hex 24)"),
});

export interface Config {
  env: "development" | "test" | "production";
  host: string;
  port: number;
  logLevel: z.infer<typeof envSchema>["LOG_LEVEL"];
  vapi: {
    serverSecret: string;
  };
}

export class ConfigError extends Error {
  override name = "ConfigError";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const values = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ""));
  const parsed = envSchema.safeParse(values);

  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `  - ${issue.path.join(".")} ${issue.message}`,
    );

    throw new ConfigError(`Invalid environment:\n${problems.join("\n")}`);
  }
  const e = parsed.data;

  return {
    env: e.NODE_ENV,
    host: e.HOST,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    vapi: { serverSecret: e.VAPI_SERVER_SECRET },
  };
}
