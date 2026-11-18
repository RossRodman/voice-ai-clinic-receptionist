import { z } from "zod";

export const vapiCallSchema = z.looseObject({
  id: z.string(),
  type: z.string().nullish(),
  startedAt: z.string().nullish(),
  customer: z.looseObject({ number: z.string().nullish() }).nullish(),
});

export type VapiCall = z.infer<typeof vapiCallSchema>;

export const toolCallSchema = z.looseObject({
  id: z.string().min(1),
  type: z.string().optional(),
  function: z.looseObject({
    name: z.string().min(1),
    arguments: z.union([z.record(z.string(), z.unknown()), z.string()]).optional(),
  }),
});
export type ToolCall = z.infer<typeof toolCallSchema>;

export const serverMessageSchema = z.object({
  message: z.looseObject({
    type: z.string().min(1),
    call: vapiCallSchema.optional(),
  }),
});

export const toolCallsMessageSchema = z.looseObject({
  type: z.literal("tool-calls"),
  toolCallList: z.array(toolCallSchema),
  call: vapiCallSchema.optional(),
});
export type ToolCallsMessage = z.infer<typeof toolCallsMessageSchema>;

export type ToolCallResult =
  | { toolCallId: string; name: string; result: string }
  | { toolCallId: string; name: string; error: string };

export const statusUpdateMessageSchema = z.looseObject({
  type: z.literal("status-update"),
  status: z.string(),
  call: vapiCallSchema,
});

const historyMessageSchema = z.looseObject({
  role: z.string(),
  message: z.string().nullish(),
  secondsFromStart: z.number().nullish(),
  toolCalls: z
    .array(
      z.looseObject({
        id: z.string(),
        function: z.looseObject({
          name: z.string(),
          arguments: z.union([z.string(), z.record(z.string(), z.unknown())]).nullish(),
        }),
      }),
    )
    .nullish(),
});
export type HistoryMessage = z.infer<typeof historyMessageSchema>;

export const endOfCallReportSchema = z.looseObject({
  type: z.literal("end-of-call-report"),
  call: vapiCallSchema,
  endedReason: z.string().nullish(),
  startedAt: z.string().nullish(),
  endedAt: z.string().nullish(),
  durationSeconds: z.number().nullish(),
  durationMs: z.number().nullish(),
  cost: z.number().nullish(),
  timestamp: z.number().nullish(),
  summary: z.string().nullish(),
  recordingUrl: z.string().nullish(),
  messages: z.array(historyMessageSchema).nullish(),
  analysis: z.looseObject({ summary: z.string().nullish() }).nullish(),
  artifact: z
    .looseObject({
      messages: z.array(historyMessageSchema).nullish(),
      recordingUrl: z.string().nullish(),
      recording: z
        .looseObject({
          url: z.string().nullish(),
          mono: z.looseObject({ combinedUrl: z.string().nullish() }).nullish(),
        })
        .nullish(),
    })
    .nullish(),
});
export type EndOfCallReport = z.infer<typeof endOfCallReportSchema>;
