import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { callMarkdown } from "../callLog/markdown.ts";
import type { CallDetail, CallSummary } from "../callLog/types.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const envFile = join(root, ".env");

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const USAGE = `Usage: npm run call:export -- [<call id> | --latest] [--out <dir>] [--recording]

Writes a call from the call log as Markdown: the details, the summary, the booking and
the conversation with the functions the assistant ran. Reads it through the running
server's /api (SERVER_URL, default http://localhost:$PORT), signing in with
FRONT_DESK_PASSWORD when it is set.

  --latest      the most recent call that has ended
  --out         where to write call.md (default: docs/test-call)
  --recording   also download the recording next to it`;

const server = (process.env.SERVER_URL ?? `http://localhost:${process.env.PORT ?? 3000}`).replace(
  /\/+$/,
  "",
);

const shown = (path: string) => {
  const rel = relative(process.cwd(), path);

  return rel.startsWith("..") ? path : rel;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const out = (line = "") => process.stdout.write(`${line}\n`);

const fail = (line: string): never => {
  process.stderr.write(`${line}\n`);
  process.exit(1);
};

async function signIn(): Promise<string | undefined> {
  const password = process.env.FRONT_DESK_PASSWORD;

  if (!password) {
    return undefined;
  }

  const res = await fetch(`${server}/api/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    return fail(`✗ Signing in to ${server} failed (${res.status}). Is FRONT_DESK_PASSWORD right?`);
  }

  return res.headers.get("set-cookie")?.split(";")[0];
}

async function get<T>(path: string, cookie: string | undefined): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${server}${path}`, { headers: cookie ? { cookie } : {} });
  } catch {
    return fail(`✗ Can't reach the server at ${server}. Start it with npm run dev.`);
  }

  const body = (await res.json().catch(() => ({}))) as T & { error?: string };

  if (!res.ok) {
    return fail(`✗ GET ${path}: ${body.error ?? res.status}`);
  }

  return body;
}

async function download(url: string, dir: string): Promise<string> {
  const res = await fetch(url);

  if (!res.ok) {
    return fail(`✗ Downloading the recording failed (${res.status})`);
  }

  const file = `recording${extname(new URL(url).pathname) || ".wav"}`;
  await writeFile(join(dir, file), Buffer.from(await res.arrayBuffer()));

  return file;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      latest: { type: "boolean", default: false },
      recording: { type: "boolean", default: false },
      out: { type: "string", default: join(root, "docs/test-call") },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help || (!values.latest && positionals.length !== 1)) {
    out(USAGE);
    process.exit(values.help ? 0 : 1);
  }

  const cookie = await signIn();
  let id = positionals[0];

  if (values.latest) {
    const { calls } = await get<{ calls: CallSummary[] }>("/api/calls?limit=20", cookie);
    id = calls.find((c) => c.status === "ended")?.id;

    if (!id) {
      fail("✗ There is no ended call in the call log yet.");
    }
  }

  const { call } = await get<{ call: CallDetail }>(`/api/calls/${encodeURIComponent(id!)}`, cookie);
  const { timezone } = await get<{ timezone: string }>("/api/clinic", cookie);

  if (call.status !== "ended") {
    out("! The call is still on: the summary and the recording come with the end-of-call report.");
  }

  await mkdir(values.out, { recursive: true });

  let recording: string | undefined;

  if (values.recording) {
    if (call.recordingUrl) {
      recording = await download(call.recordingUrl, values.out);
      out(`✓ ${shown(join(values.out, recording))}`);
    } else {
      out("! The call has no recording: Vapi sends it with the end-of-call report.");
    }
  }

  const file = join(values.out, "call.md");
  await writeFile(file, callMarkdown(call, timezone, recording ? { recording } : {}));
  out(
    `✓ ${shown(file)}  (${plural(call.transcript.length, "turn")}, ${plural(call.toolCalls.length, "function")})`,
  );
}

main().catch((err: Error) => fail(`✗ ${err.message}`));
