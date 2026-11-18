import type { Clinic } from "../clinic/schema.ts";
import type { Config } from "../config.ts";
import { type Assistant, buildAssistant, DEFAULT_MODEL } from "./assistant.ts";

export * from "./assistant.ts";
export * from "./prompt.ts";
export * from "./sync.ts";
export * from "./vapiApi.ts";

export const SECRET_PLACEHOLDER = "<VAPI_SERVER_SECRET>";

export const URL_PLACEHOLDER = "https://<PUBLIC_URL>";

export interface AssistantSetup {
  webhookUrl: string | null;
  transferNumber: string | null;
  apiKey: boolean;
  assistantId: string | null;
  phoneNumberId: string | null;
  model: string;
}

export interface AssistantOverview {
  assistant: Assistant;
  setup: AssistantSetup;
}

export function assistantFromConfig(config: Config, clinic: Clinic, serverSecret: string) {
  return buildAssistant({
    clinic,
    serverUrl: config.publicUrl ?? URL_PLACEHOLDER,
    serverSecret,
    transferNumber: config.transferNumber,
    model: config.vapi.model,
  });
}

export function assistantOverview(config: Config, clinic: Clinic): AssistantOverview {
  return {
    assistant: assistantFromConfig(config, clinic, SECRET_PLACEHOLDER),
    setup: {
      webhookUrl: config.publicUrl ? `${config.publicUrl}/vapi/webhook` : null,
      transferNumber: config.transferNumber ?? null,
      apiKey: Boolean(config.vapi.apiKey),
      assistantId: config.vapi.assistantId ?? null,
      phoneNumberId: config.vapi.phoneNumberId ?? null,
      model: config.vapi.model ?? DEFAULT_MODEL,
    },
  };
}
