import type { FastifyBaseLogger } from "fastify";
import type { Appointment } from "../booking/service.ts";
import type { EndOfCallReport, VapiCall } from "../vapi/schemas.ts";
import type { ToolRun } from "../vapi/tools.ts";
import { callOutcome, parseReport } from "./report.ts";
import type { CallDetail, CallStore, CallUpdate } from "./types.ts";

export class CallRecorder {
  readonly store: CallStore;
  private readonly log: FastifyBaseLogger;
  private readonly now: () => Date;
  private readonly queues = new Map<string, Promise<void>>();

  constructor(store: CallStore, log: FastifyBaseLogger, now: () => Date = () => new Date()) {
    this.store = store;
    this.log = log;
    this.now = now;
  }

  private enqueue<T>(callId: string, what: string, task: () => Promise<T>): Promise<T> {
    const run = (this.queues.get(callId) ?? Promise.resolve()).then(task);

    const settled = run.then(
      () => undefined,
      (err: unknown) => this.log.error({ err, callId }, `call log: could not save ${what}`),
    );

    this.queues.set(callId, settled);

    void settled.then(() => {
      if (this.queues.get(callId) === settled) {
        this.queues.delete(callId);
      }
    });

    return run;
  }

  private background(callId: string, what: string, task: () => Promise<void>) {
    this.enqueue(callId, what, task).catch(() => undefined);
  }

  callSeen(call: VapiCall) {
    const row: CallUpdate = {
      id: call.id,
      status: "in-progress",
      ...(call.type ? { type: call.type } : {}),
      ...(call.customer?.number ? { customerNumber: call.customer.number } : {}),
      startedAt: new Date(Date.parse(call.startedAt ?? "") || this.now().getTime()).toISOString(),
    };

    this.background(call.id, "the call", () => this.store.openCall(row));
  }

  toolCallsDone(callId: string, runs: ToolRun[]) {
    if (runs.length === 0) {
      return;
    }

    const rows = runs.map(({ response, arguments: args, value, durationMs }) => ({
      id: response.toolCallId,
      callId,
      name: response.name,
      arguments: args,
      result: "result" in response ? value : null,
      error: "error" in response ? response.error : null,
      durationMs,
    }));
    this.background(callId, "tool calls", () => this.store.saveToolCalls(rows));
  }

  booked(a: Appointment) {
    this.background(a.callId ?? "", "the booking", () =>
      this.store.saveBooking({
        id: a.id,
        callId: a.callId ?? null,
        serviceId: a.serviceId,
        service: a.service,
        providerId: a.providerId,
        provider: a.provider,
        startsAt: new Date(a.start).toISOString(),
        endsAt: new Date(a.end).toISOString(),
        patientName: a.patientName,
        patientPhone: a.patientPhone,
        newPatient: a.newPatient ?? null,
        notes: a.notes ?? null,
      }),
    );
  }

  endOfCall(report: EndOfCallReport): Promise<CallDetail | null> {
    const { call, toolCalls } = parseReport(report, this.now());

    return this.enqueue(call.id, "the end-of-call report", async () => {
      const before = await this.store.getCall(call.id);
      const outcome = callOutcome({
        endedReason: call.endedReason,
        booked: (before?.bookings.length ?? 0) > 0,
        transcript: call.transcript ?? [],
        toolNames: [...toolCalls, ...(before?.toolCalls ?? [])].map((t) => t.name),
      });

      await this.store.saveCall({ ...call, outcome });
      await this.store.saveToolCalls(toolCalls);

      return this.store.getCall(call.id);
    });
  }

  /** Resolves once every write so far has finished. */
  async idle(): Promise<void> {
    while (this.queues.size > 0) {
      await Promise.all(this.queues.values());
    }
  }
}
