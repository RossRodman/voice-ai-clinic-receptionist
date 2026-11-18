export const VAPI_API_URL = "https://api.vapi.ai";

export class VapiApiError extends Error {
  override name = "VapiApiError";
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export interface VapiAssistantRecord {
  id: string;
  name?: string;
  updatedAt?: string;
}

export interface VapiPhoneNumberRecord {
  id: string;
  number?: string;
  assistantId?: string | null;
}

export interface VapiApiOptions {
  apiKey: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const { message } = body;

    if (Array.isArray(message)) {
      return message.join("; ");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  return fallback;
}

export class VapiApi {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: VapiApiOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? VAPI_API_URL).replace(/\/+$/, "");
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  listAssistants(): Promise<VapiAssistantRecord[]> {
    return this.request("GET", "/assistant?limit=1000");
  }

  createAssistant(assistant: object): Promise<VapiAssistantRecord> {
    return this.request("POST", "/assistant", assistant);
  }

  updateAssistant(id: string, assistant: object): Promise<VapiAssistantRecord> {
    return this.request("PATCH", `/assistant/${encodeURIComponent(id)}`, assistant);
  }

  assignPhoneNumber(id: string, assistantId: string): Promise<VapiPhoneNumberRecord> {
    return this.request("PATCH", `/phone-number/${encodeURIComponent(id)}`, { assistantId });
  }

  private async request<T>(method: string, path: string, body?: object): Promise<T> {
    let res: Response;

    try {
      res = await this.fetchFn(`${this.baseUrl}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new VapiApiError(`Vapi is unreachable: ${(err as Error).message}`);
    }

    const text = await res.text();
    let json: unknown = null;

    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      const message = errorMessage(json, res.statusText || "request failed");

      throw new VapiApiError(`Vapi ${res.status}: ${message}`, res.status);
    }

    return json as T;
  }
}
