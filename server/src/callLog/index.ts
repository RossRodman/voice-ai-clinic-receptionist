import type { Config } from "../config.ts";
import { InMemoryCallStore } from "./memory.ts";
import { SupabaseCallStore } from "./supabase.ts";
import type { CallStore } from "./types.ts";

export { CallRecorder } from "./recorder.ts";
export * from "./stats.ts";
export * from "./types.ts";

export function createCallStore(config: Config): CallStore {
  return config.supabase
    ? new SupabaseCallStore({
        url: config.supabase.url,
        key: config.supabase.secretKey,
      })
    : new InMemoryCallStore();
}
