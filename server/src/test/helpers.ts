import type { Config } from "../config.ts";
import { loadClinicData, type ClinicData } from "../knowledgeBase/load.ts";

export const TEST_SECRET = "test-secret-0123456789abcdef";

export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    env: "test",
    host: "127.0.0.1",
    port: 0,
    logLevel: "silent",
    vapi: { serverSecret: TEST_SECRET },
    ...overrides,
  };
}

export function toolCallsMessage(
  calls: { id?: string; name: string; arguments?: Record<string, unknown> | string }[],
) {
  return {
    message: {
      type: "tool-calls",
      call: { id: "call_123", customer: { number: "+15551234567" } },
      toolCallList: calls.map((call, i) => ({
        id: call.id ?? `tc_${i + 1}`,
        type: "function",
        function: { name: call.name, arguments: call.arguments ?? {} },
      })),
    },
  };
}

let clinicData: Promise<ClinicData> | undefined;

export function testClinic(): Promise<ClinicData> {
  clinicData ??= loadClinicData();
  return clinicData;
}
