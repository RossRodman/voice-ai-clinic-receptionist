import { randomInt, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envFile = fileURLToPath(new URL("../../../.env", import.meta.url));

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const server = (process.env.SERVER_URL ?? `http://localhost:${process.env.PORT ?? 3000}`).replace(
  /\/+$/,
  "",
);
const secret = process.env.VAPI_SERVER_SECRET;

type Json = Record<string, unknown>;

interface Slot {
  start: string;
  spoken: string;
  provider: string;
  providerId: string;
}

class DemoCall {
  readonly id = `demo-${randomUUID().slice(0, 8)}`;
  readonly number = `+1555${randomInt(100, 200).toString().padStart(3, "0")}${randomInt(1000, 10000)}`;
  private readonly startedAt = new Date();
  private readonly history: Json[] = [{ role: "system", message: "…", secondsFromStart: 0 }];
  private seconds = 0.8;
  private toolCount = 0;

  private get call() {
    return {
      id: this.id,
      type: "inboundPhoneCall",
      startedAt: this.startedAt.toISOString(),
      customer: { number: this.number },
    };
  }

  private async post(message: Json): Promise<Json> {
    const res = await fetch(`${server}/vapi/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-vapi-secret": secret ?? "" },
      body: JSON.stringify({ message: { ...message, call: this.call } }),
    });
    const body = (await res.json().catch(() => ({}))) as Json;

    if (!res.ok) {
      throw new Error(`${message.type}: ${res.status} ${JSON.stringify(body)}`);
    }

    return body;
  }

  async start() {
    await this.post({ type: "status-update", status: "in-progress" });
  }

  say(role: "bot" | "user", text: string) {
    this.history.push({ role, message: text, secondsFromStart: this.seconds });
    this.seconds += 1.5 + text.split(/\s+/).length * 0.35;
  }

  /** One of the server's functions, run for real. */
  async tool<T>(name: string, args: Json): Promise<T> {
    const id = `${this.id}-tc${++this.toolCount}`;
    this.recordToolCall(id, name, args);
    const body = await this.post({
      type: "tool-calls",
      toolCallList: [{ id, type: "function", function: { name, arguments: args } }],
    });
    const [result] = body.results as { result?: string; error?: string }[];

    if (result?.error) {
      throw new Error(`${name}: ${result.error}`);
    }

    this.history.push({ role: "tool_call_result", toolCallId: id, name, result: result?.result });

    return JSON.parse(result?.result ?? "null") as T;
  }

  recordToolCall(id: string, name: string, args: Json) {
    this.history.push({
      role: "tool_calls",
      secondsFromStart: this.seconds,
      toolCalls: [{ id, type: "function", function: { name, arguments: JSON.stringify(args) } }],
    });
    this.seconds += 0.8;
  }

  async end(endedReason: string, summary: string) {
    const startedAt = new Date(Date.now() - this.seconds * 1000);
    await this.post({
      type: "end-of-call-report",
      endedReason,
      startedAt: startedAt.toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: this.seconds,
      cost: Math.round(this.seconds * 0.0012 * 10_000) / 10_000,
      analysis: { summary },
      artifact: { messages: this.history },
    });

    return this;
  }
}

const out = (line: string) => process.stdout.write(`${line}\n`);
const fail = (line: string): never => {
  process.stderr.write(`${line}\n`);
  process.exit(1);
};

const firstSentence = (text: string) => text.split(/(?<=[.!?])\s/)[0] ?? text;

async function booking(clinic: string) {
  const call = new DemoCall();
  const [first, last] = [
    ["Maria", "Lopez"],
    ["Tom", "Reed"],
    ["Priya", "Shah"],
    ["Daniel", "Kim"],
  ][randomInt(4)]!;
  const name = `${first} ${last}`;
  await call.start();

  call.say("bot", `Thanks for calling ${clinic}. How can I help you today?`);
  call.say("user", "Hi, I'd like to book a cleaning. It's been about a year.");
  call.say("bot", "Sure, I can help with that. Let me check what's free.");

  const offer = await call.tool<{ slots: Slot[] }>("check_availability", {
    serviceId: "checkup-cleaning",
  });
  const [a, b] = offer.slots;

  if (!a) {
    call.say("bot", "I'm sorry, there's nothing free in the next weeks. Can I transfer you?");
    call.say("user", "No thanks, I'll call back.");

    return call.end("customer-ended-call", `${name} asked for a cleaning; nothing was free.`);
  }

  call.say("bot", `I have ${a.spoken}${b ? ` or ${b.spoken}` : ""}. Which works better?`);
  call.say("user", "The first one, please.");
  call.say(
    "bot",
    "Great. Can I have your full name, and is this number the best one to reach you?",
  );
  call.say("user", `${name}, and yes, this number is fine. It's my first visit.`);

  const booked = await call.tool<{
    booked: boolean;
    when?: string;
    provider?: string;
    reason?: string;
  }>("book_appointment", {
    serviceId: "checkup-cleaning",
    start: a.start,
    providerId: a.providerId,
    patientName: name,
    newPatient: true,
  });

  if (!booked.booked) {
    call.say("bot", `I'm sorry, ${booked.reason ?? "that time was just taken"}.`);
    call.say("user", "Never mind, I'll call back later.");

    return call.end("customer-ended-call", `${name} tried to book a cleaning; the time was taken.`);
  }

  call.say(
    "bot",
    `You're all set, ${first}: a checkup and cleaning on ${booked.when} with ${booked.provider}. Please arrive ten minutes early. Anything else?`,
  );
  call.say("user", "No, that's it. Thank you!");
  call.say("bot", "You're welcome. See you soon!");

  return call.end(
    "customer-ended-call",
    `${name}, a new patient, booked a checkup and cleaning for ${booked.when} with ${booked.provider}.`,
  );
}

async function questions(clinic: string) {
  const call = new DemoCall();
  await call.start();
  call.say("bot", `Thanks for calling ${clinic}. How can I help you today?`);

  const asked: string[] = [];

  for (const [question, query] of [
    ["Hi, do you take Delta Dental?", "do you take Delta Dental insurance"],
    ["And is there parking near you?", "is there parking"],
  ] as const) {
    call.say("user", question);
    const result = await call.tool<{ found: boolean; answers?: { answer: string }[] }>(
      "search_knowledge_base",
      { query },
    );
    const answer = result.answers?.[0]?.answer;
    call.say("bot", answer ? firstSentence(answer) : "I don't have that information, sorry.");
    asked.push(query.replace(/^(do you take|is there) /, ""));
  }

  call.say("user", "Perfect, that's all I needed. Thanks!");
  call.say("bot", "You're welcome. Have a great day!");

  return call.end(
    "customer-ended-call",
    `The caller asked about ${asked.join(" and ")}; both were answered from the knowledge base.`,
  );
}

async function transfer(clinic: string) {
  const call = new DemoCall();
  await call.start();
  call.say("bot", `Thanks for calling ${clinic}. How can I help you today?`);
  call.say("user", "My back tooth has been throbbing since last night and my cheek is swollen.");
  call.say(
    "bot",
    "I'm sorry, that sounds painful. Swelling should be seen quickly, so let me put you through to our front desk right now.",
  );
  call.recordToolCall(`${call.id}-transfer`, "transferCall", {
    destination: { type: "number", number: "+15550142300" },
  });

  return call.end(
    "assistant-forwarded-call",
    "The caller has a toothache with facial swelling; the assistant transferred them to the front desk.",
  );
}

const SCENARIOS = { booking, questions, transfer };

async function main() {
  if (!secret) {
    fail("VAPI_SERVER_SECRET is not set: copy .env.example to .env and fill it in.");
  }

  const wanted = process.argv.slice(2);
  const unknown = wanted.filter((w) => !(w in SCENARIOS));

  if (unknown.length) {
    fail(`Unknown scenario ${unknown.join(", ")}. Use: ${Object.keys(SCENARIOS).join(", ")}.`);
  }

  const clinicRes = await fetch(`${server}/api/clinic`).catch((err: Error) =>
    fail(`The server isn't reachable at ${server} (${err.message}). Start it with npm run dev.`),
  );
  const { name } = (await clinicRes.json()) as { name: string };

  for (const scenario of (wanted.length
    ? wanted
    : Object.keys(SCENARIOS)) as (keyof typeof SCENARIOS)[]) {
    const call = await SCENARIOS[scenario](name);
    out(`✓ ${scenario.padEnd(9)} ${call.id}  ${server}/api/calls/${call.id}`);
  }

  out("\nOpen Front Desk → Calls to see them.");
}

await main();
