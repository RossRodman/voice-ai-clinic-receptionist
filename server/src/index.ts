import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.ts";
import { createCalendar } from "./calendar/index.ts";
import { createCallStore } from "./callLog/index.ts";
import { ConfigError, loadConfig } from "./config.ts";
import { loadClinicData } from "./knowledgeBase/load.ts";

const envFile = fileURLToPath(new URL("../../.env", import.meta.url));

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

let config;

try {
  config = loadConfig();
} catch (err) {
  if (!(err instanceof ConfigError)) {
    throw err;
  }

  process.stderr.write(`${err.message}\n\nCopy .env.example to .env and fill it in.\n`);
  process.exit(1);
}

const clinic = await loadClinicData();
const calendar = createCalendar(config, clinic.clinic);
const callStore = createCallStore(config);
const app = await buildApp(config, { clinic, calendar, callStore });

if (calendar.kind === "demo") {
  app.log.warn(
    "Google Calendar is not configured (GOOGLE_CALENDAR_ID, GOOGLE_SERVICE_ACCOUNT_KEY): booking into the in-memory demo calendar",
  );
} else {
  app.log.info({ calendarId: config.googleCalendar?.calendarId }, "booking into Google Calendar");
}

if (callStore.kind === "memory") {
  app.log.warn(
    "Supabase is not configured (SUPABASE_URL, SUPABASE_SECRET_KEY): the call log is kept in memory",
  );
} else {
  app.log.info({ url: config.supabase?.url }, "logging calls to Supabase");
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, "shutting down");
    app.close().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
}

await app.listen({ host: config.host, port: config.port });
