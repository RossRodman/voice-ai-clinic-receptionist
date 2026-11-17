import { formatPrice, hoursLines, joinList } from "../clinic/format.ts";
import type { Clinic } from "../clinic/schema.ts";

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  source: "clinic" | "faq";
  serviceId?: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseFaq(markdown: string): KnowledgeEntry[] {
  const sections = markdown.split(/^## +/m).slice(1);

  return sections.map((section) => {
    const [heading = "", ...rest] = section.split("\n");
    const title = heading.trim();
    let body = rest.join("\n").trim();
    let keywords: string[] = [];
    const match = body.match(/^keywords:(.*)$/im);

    if (match && body.startsWith(match[0])) {
      keywords = (match[1] ?? "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      body = body.slice(match[0].length).trim();
    }
    const content = body.replace(/\s*\n\s*/g, " ");

    if (!title || !content) throw new Error(`FAQ entry "${title || "(no title)"}" is empty`);

    return { id: `faq:${slugify(title)}`, title, content, keywords, source: "faq" };
  });
}

export function clinicEntries(clinic: Clinic): KnowledgeEntry[] {
  const providerName = new Map(clinic.providers.map((p) => [p.id, p.name]));
  const hours = hoursLines(clinic.hours)
    .map((line) =>
      line.hours === "closed" ? `closed on ${line.days}` : `${line.days} ${line.hours}`,
    )
    .join("; ");

  const entries: KnowledgeEntry[] = [
    {
      id: "hours",
      title: "Opening hours",
      content: `${clinic.name} is open ${hours}. All times are local time.`,
      keywords: ["open", "close", "hours", "times", "weekend", "schedule"],
      source: "clinic",
    },
    {
      id: "contact",
      title: "Address and contact",
      content: `${clinic.name} is at ${clinic.address}. Phone ${clinic.phone}, email ${clinic.email}, website ${clinic.website}.`,
      keywords: ["address", "where", "location", "phone", "number", "email", "website", "contact"],
      source: "clinic",
    },
    {
      id: "team",
      title: "Our dentists and hygienist",
      content: clinic.providers
        .map((p) => `${p.name}, ${p.title}: ${p.role.toLowerCase()}. ${p.bio}`)
        .join(" "),
      keywords: ["dentist", "doctor", "team", "staff", "hygienist", "who"],
      source: "clinic",
    },
    {
      id: "services",
      title: "Services and prices",
      content: `${clinic.name} offers: ${clinic.services
        .map((s) => `${s.name.toLowerCase()} ${formatPrice(s.price)}`)
        .join("; ")}.`,
      keywords: ["services", "treatments", "price list", "offer", "provide"],
      source: "clinic",
    },
    {
      id: "insurance",
      title: "Insurance",
      content: [
        `We are in network with ${joinList(clinic.insurance.inNetwork)}.`,
        clinic.insurance.notAccepted.length
          ? `We don't accept ${joinList(clinic.insurance.notAccepted, "or")}.`
          : "",
        clinic.insurance.notes,
      ]
        .filter(Boolean)
        .join(" "),
      keywords: ["insurance", "plan", "accept", "take", "network", "coverage", "ppo"],
      source: "clinic",
    },
  ];

  for (const s of clinic.services) {
    const who = joinList(
      s.providers.map((id) => providerName.get(id) ?? id),
      "or",
    );
    entries.push({
      id: `service:${s.id}`,
      title: s.name,
      content: `${s.name}: ${s.description} It takes about ${s.durationMinutes} minutes and costs ${formatPrice(s.price)}. With ${who}.`,
      keywords: s.keywords,
      source: "clinic",
      serviceId: s.id,
    });
  }

  return entries;
}
