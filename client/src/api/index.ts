export interface Health {
  status: "ok";
  uptime: number;
}

export interface HoursLine {
  days: string;
  hours: string;
}

export interface Provider {
  id: string;
  name: string;
  title: string;
  role: string;
  bio: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: string;
  providers: string[];
}

export interface Clinic {
  name: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  timezone: string;
  hours: HoursLine[];
  providers: Provider[];
  services: Service[];
  insurance: { inNetwork: string[]; notAccepted: string[]; notes: string };
  languages: string[];
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  source: "clinic" | "faq";
  serviceId?: string;
}

export type ToolResult =
  | { found: true; answers: { topic: string; answer: string; serviceId?: string }[] }
  | { found: false; instruction: string };

export interface SearchResponse {
  query: string;
  found: boolean;
  terms: string[];
  coverage: number;
  hits: (KnowledgeEntry & { score: number })[];
  toolResult: ToolResult;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function describeError(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  for (const key of ["error", "message"] as const) {
    if (key in body) {
      const value: unknown = body[key as keyof typeof body];
      if (typeof value === "string") return value;
    }
  }

  return null;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);

    throw new ApiError(
      response.status,
      describeError(body) ?? `${init?.method ?? "GET"} ${url} failed (${response.status})`,
    );
  }

  return (await response.json()) as T;
}

export const api = {
  health: (signal?: AbortSignal) => request<Health>("/health", { signal }),
  clinic: (signal?: AbortSignal) => request<Clinic>("/api/clinic", { signal }),
  knowledgeBase: (signal?: AbortSignal) =>
    request<{ entries: KnowledgeEntry[] }>("/api/knowledge-base", { signal }),
  searchKnowledgeBase: (q: string, signal?: AbortSignal) =>
    request<SearchResponse>(`/api/knowledge-base/search?${new URLSearchParams({ q })}`, {
      signal,
    }),
};
