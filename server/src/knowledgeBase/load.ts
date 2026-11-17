import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { clinicSchema, type Clinic } from "../clinic/schema.ts";
import { clinicEntries, parseFaq } from "./entries.ts";
import { KnowledgeBase } from "./search.ts";

export const DEFAULT_DATA_DIR = fileURLToPath(new URL("../../data", import.meta.url));

export interface ClinicData {
  clinic: Clinic;
  knowledgeBase: KnowledgeBase;
}

export async function loadClinicData(dataDir = DEFAULT_DATA_DIR): Promise<ClinicData> {
  const clinicPath = join(dataDir, "clinic.json");
  const parsed = clinicSchema.safeParse(JSON.parse(await readFile(clinicPath, "utf8")));

  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`${clinicPath} is invalid:\n${problems.join("\n")}`);
  }

  const clinic = parsed.data;

  const faq = parseFaq(await readFile(join(dataDir, "faq.md"), "utf8"));
  const knowledgeBase = new KnowledgeBase([...clinicEntries(clinic), ...faq]);

  return { clinic, knowledgeBase };
}
