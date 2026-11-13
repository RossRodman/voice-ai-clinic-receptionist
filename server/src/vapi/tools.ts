import type { FastifyBaseLogger } from "fastify";
import type { ToolCall, ToolCallResult, VapiCall } from "./schemas.ts";

export interface ToolContext {
  call?: VapiCall;
  log: FastifyBaseLogger;
}

export type ToolHandler = (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;

export type ToolRegistry = Readonly<Record<string, ToolHandler>>;

export class ToolError extends Error {
  override name = "ToolError";
}

const GENERIC_ERROR =
  "The system could not complete this request. Apologize, and offer to transfer the caller to the front desk.";

function parseArguments(raw: ToolCall["function"]["arguments"]): Record<string, unknown> {
  if (raw === undefined || raw === "") return {};
  if (typeof raw !== "string") return raw;

  const parsed: unknown = JSON.parse(raw);

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ToolError("Tool arguments must be a JSON object.");
  }

  return parsed as Record<string, unknown>;
}

async function runOne(
  toolCall: ToolCall,
  tools: ToolRegistry,
  ctx: ToolContext,
): Promise<ToolCallResult> {
  const { id: toolCallId, function: fn } = toolCall;
  const name = fn.name;
  const handler = Object.hasOwn(tools, name) ? tools[name] : undefined;
  const log = ctx.log.child({ toolCallId, tool: name });

  if (!handler) {
    log.warn("unknown tool");
    return { toolCallId, name, error: `Unknown tool "${name}".` };
  }

  const started = performance.now();

  try {
    const value = await handler(parseArguments(fn.arguments), { ...ctx, log });
    log.info({ ms: Math.round(performance.now() - started) }, "tool call done");
    const result = typeof value === "string" ? value : JSON.stringify(value ?? null);

    return { toolCallId, name, result };
  } catch (err) {
    if (err instanceof ToolError) {
      log.info({ reason: err.message }, "tool call refused");
      return { toolCallId, name, error: err.message };
    }

    if (err instanceof SyntaxError) {
      log.warn({ err }, "tool arguments are not valid JSON");
      return { toolCallId, name, error: "Tool arguments are not valid JSON." };
    }

    log.error({ err }, "tool call failed");

    return { toolCallId, name, error: GENERIC_ERROR };
  }
}

export function runToolCalls(
  toolCalls: readonly ToolCall[],
  tools: ToolRegistry,
  ctx: ToolContext,
): Promise<ToolCallResult[]> {
  return Promise.all(toolCalls.map((toolCall) => runOne(toolCall, tools, ctx)));
}
