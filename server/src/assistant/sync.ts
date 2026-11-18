import type { Assistant } from "./assistant.ts";
import { type VapiApi, VapiApiError } from "./vapiApi.ts";

export interface SyncOptions {
  assistantId?: string | undefined;
  phoneNumberId?: string | undefined;
}

export interface SyncResult {
  action: "created" | "updated";
  assistantId: string;
  phoneNumber?: string | undefined;
}

async function findByName(api: VapiApi, name: string): Promise<string | undefined> {
  const assistants = await api.listAssistants();

  return assistants.find((a) => a.name === name)?.id;
}

async function upsert(api: VapiApi, assistant: Assistant, assistantId?: string) {
  if (assistantId) {
    try {
      const updated = await api.updateAssistant(assistantId, assistant);

      return { action: "updated" as const, assistantId: updated.id };
    } catch (err) {
      if (err instanceof VapiApiError && err.status === 404) {
        throw new VapiApiError(
          `There is no assistant ${assistantId} in this Vapi account. Check VAPI_ASSISTANT_ID, or remove it to create a new assistant.`,
          404,
        );
      }

      throw err;
    }
  }

  const existing = await findByName(api, assistant.name);

  if (existing) {
    await api.updateAssistant(existing, assistant);

    return { action: "updated" as const, assistantId: existing };
  }

  const created = await api.createAssistant(assistant);

  return { action: "created" as const, assistantId: created.id };
}

export async function syncAssistant(
  api: VapiApi,
  assistant: Assistant,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const result: SyncResult = await upsert(api, assistant, options.assistantId);

  if (options.phoneNumberId) {
    const phone = await api.assignPhoneNumber(options.phoneNumberId, result.assistantId);

    result.phoneNumber = phone.number ?? options.phoneNumberId;
  }

  return result;
}
