import type { Clinic } from "../clinic/schema.ts";
import { BOOK_APPOINTMENT } from "../tools/bookAppointment.ts";
import { CHECK_AVAILABILITY } from "../tools/checkAvailability.ts";
import { toolDefinitions } from "../tools/index.ts";
import { ASSISTANT_NAME, END_CALL, summaryPrompt, systemPrompt, TRANSFER_CALL } from "./prompt.ts";

export const DEFAULT_MODEL = "anthropic/claude-sonnet-5-5";

export const VOICE = { provider: "vapi", voiceId: "Savannah" } as const;

export const MAX_CALL_SECONDS = 15 * 60;

const NAME_MAX_LENGTH = 40;

const WAIT_MESSAGES: Record<string, string> = {
  [CHECK_AVAILABILITY]: "Let me check the schedule.",
  [BOOK_APPOINTMENT]: "One moment while I book that.",
};

export interface AssistantOptions {
  clinic: Clinic;
  serverUrl: string;
  serverSecret: string;
  transferNumber?: string | undefined;
  model?: string | undefined;
}

function splitModel(model: string) {
  const [provider = "", ...rest] = model.split("/");

  return { provider, model: rest.join("/") };
}

function keyterms(clinic: Clinic): string[] {
  const surnames = clinic.providers.map((p) => p.name.split(" ").at(-1) ?? p.name);

  return [...new Set([clinic.name, ...surnames, ...clinic.insurance.inNetwork])];
}

function transferTool(clinic: Clinic, number: string) {
  return {
    type: TRANSFER_CALL,
    destinations: [
      {
        type: "number",
        number,
        message: "Sure, I'm putting you through to the front desk now. Please hold.",
        description: `The front desk at ${clinic.name}`,
      },
    ],
  } as const;
}

export function buildAssistant(options: AssistantOptions) {
  const { clinic, transferNumber } = options;
  const webhook = `${options.serverUrl}/vapi/webhook`;
  const server = { url: webhook, headers: { "x-vapi-secret": options.serverSecret } };
  const canTransfer = Boolean(transferNumber);

  const functions = toolDefinitions(clinic).map((definition) => {
    const wait = WAIT_MESSAGES[definition.function.name];

    return {
      ...definition,
      server,
      ...(wait ? { messages: [{ type: "request-start", content: wait }] } : {}),
    };
  });

  const tools = [
    ...functions,
    ...(transferNumber ? [transferTool(clinic, transferNumber)] : []),
    { type: END_CALL },
  ];

  return {
    name: `${clinic.name} receptionist`.slice(0, NAME_MAX_LENGTH),
    firstMessage: `Thank you for calling ${clinic.name}, this is ${ASSISTANT_NAME}, the virtual assistant. How can I help you today?`,
    firstMessageMode: "assistant-speaks-first",
    model: {
      ...splitModel(options.model ?? DEFAULT_MODEL),
      temperature: 0.3,
      messages: [{ role: "system", content: systemPrompt(clinic, { canTransfer }) }],
      tools,
    },
    voice: VOICE,
    transcriber: {
      provider: "deepgram",
      model: "nova-3",
      language: "en",
      keyterm: keyterms(clinic),
    },
    endCallMessage: `Thanks for calling ${clinic.name}. Have a great day!`,
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: MAX_CALL_SECONDS,
    server,
    serverMessages: ["status-update", "end-of-call-report"],
    artifactPlan: { recordingEnabled: true },
    analysisPlan: {
      summaryPlan: {
        messages: [
          { role: "system", content: summaryPrompt(clinic) },
          { role: "user", content: "Here is the transcript:\n\n{{transcript}}" },
        ],
      },
    },
    metadata: { app: "voice-ai-clinic-receptionist" },
  };
}

export type Assistant = ReturnType<typeof buildAssistant>;
