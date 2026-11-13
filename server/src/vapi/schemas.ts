import { z } from "zod";

export const vapiCallSchema = z.looseObject({
  id: z.string(),
  customer: z.looseObject({ number: z.string().optional() }).optional(),
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
