import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  assistantFromConfig,
  SECRET_PLACEHOLDER,
  syncAssistant,
  VapiApi,
} from "../assistant/index.ts";
import { ConfigError, loadConfig } from "../config.ts";
import { loadClinicData } from "../knowledgeBase/load.ts";

const envFile = fileURLToPath(new URL("../../../.env", import.meta.url));

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const DASHBOARD = "https://dashboard.vapi.ai/assistants";

const out = (line = "") => process.stdout.write(`${line}\n`);

const fail = (line: string): never => {
  process.stderr.write(`${line}\n`);
  process.exit(1);
};

function config() {
  try {
    return loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      return fail(`${err.message}\n\nCopy .env.example to .env and fill it in.`);
    }

    throw err;
  }
}

async function main() {
  const settings = config();
  const { clinic } = await loadClinicData();
  const print = process.argv.includes("--print");

  if (print) {
    out(JSON.stringify(assistantFromConfig(settings, clinic, SECRET_PLACEHOLDER), null, 2));

    return;
  }

  const missing = [
    settings.vapi.apiKey ? null : "VAPI_API_KEY (Vapi dashboard → API Keys → private key)",
    settings.publicUrl ? null : "PUBLIC_URL (where Vapi reaches this server, e.g. an ngrok URL)",
  ].filter((m) => m !== null);

  if (missing.length > 0) {
    fail(`Set these in .env first:\n${missing.map((m) => `  - ${m}`).join("\n")}`);
  }

  const assistant = assistantFromConfig(settings, clinic, settings.vapi.serverSecret);
  const api = new VapiApi({ apiKey: settings.vapi.apiKey! });

  const result = await syncAssistant(api, assistant, {
    assistantId: settings.vapi.assistantId,
    phoneNumberId: settings.vapi.phoneNumberId,
  });

  out(`✓ ${result.action} "${assistant.name}"  ${DASHBOARD}/${result.assistantId}`);
  out(`  webhook  ${assistant.server.url}`);
  out(`  model    ${assistant.model.provider}/${assistant.model.model}`);

  if (!settings.transferNumber) {
    out("  ! TRANSFER_NUMBER is not set: the assistant can't put callers through to a person.");
  }

  if (result.phoneNumber) {
    out(`✓ ${result.phoneNumber} now rings this assistant. Call it!`);
  } else {
    out();
    out("Next: in the Vapi dashboard, open Phone Numbers and pick this assistant,");
    out("or set VAPI_PHONE_NUMBER_ID and run this again. To talk to it in the browser,");
    out("use Talk to Assistant on its page.");
  }

  if (!settings.vapi.assistantId) {
    out();
    out(`Tip: add VAPI_ASSISTANT_ID=${result.assistantId} to .env to update this exact one.`);
  }
}

main().catch((err: Error) => fail(`✗ ${err.message}`));
