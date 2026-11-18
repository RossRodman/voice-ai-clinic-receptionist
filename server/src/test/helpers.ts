import { buildApp } from "../app.ts";
import { InMemoryCalendar } from "../calendar/memory.ts";
import { InMemoryCallStore } from "../callLog/memory.ts";
import type { CallStore } from "../callLog/types.ts";
import type { CalendarClient } from "../calendar/types.ts";
import type { Config } from "../config.ts";
import { loadClinicData, type ClinicData } from "../knowledgeBase/load.ts";
import type { ToolRegistry } from "../vapi/tools.ts";

export const TEST_NOW = new Date("2026-11-17T16:00:00Z");

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

export async function testApp(
  options: {
    calendar?: CalendarClient;
    callStore?: CallStore;
    tools?: ToolRegistry;
    now?: Date;
  } = {},
) {
  const calendar = options.calendar ?? new InMemoryCalendar();
  const now = options.now ?? TEST_NOW;
  const callStore = options.callStore ?? new InMemoryCallStore(() => now);
  const app = await buildApp(testConfig(), {
    clinic: await testClinic(),
    calendar,
    callStore,
    now: () => now,
    ...(options.tools ? { tools: options.tools } : {}),
  });
  return Object.assign(app, { calendar, callStore });
}
