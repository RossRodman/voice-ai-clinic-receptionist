import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.ts";
import { ConfigError, loadConfig } from "./config.ts";
import { loadClinicData } from "./knowledgeBase/load.ts";

const envFile = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

let config;

try {
  config = loadConfig();
} catch (err) {
  if (!(err instanceof ConfigError)) throw err;
  process.stderr.write(`${err.message}\n\nCopy .env.example to .env and fill it in.\n`);
  process.exit(1);
}

const app = await buildApp(config, { clinic: await loadClinicData() });

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
