import type { Clinic, KnowledgeEntry, SearchResponse } from "@/types";

export const CLINIC: Clinic = {
  name: "Brightside Dental",
  phone: "+1 (555) 014-2300",
  email: "hello@brightside-dental.example",
  address: "214 Maple Avenue, Suite 3, Springfield, IL 62704",
  website: "brightside-dental.example",
  timezone: "America/Chicago",
  hours: [
    { days: "Monday to Thursday", hours: "8 AM to 6 PM" },
    { days: "Sunday", hours: "closed" },
  ],
  providers: [
    { id: "dr-okafor", name: "Dr. James Okafor", title: "DMD", role: "General dentist", bio: "" },
    { id: "hannah-lee", name: "Hannah Lee", title: "RDH", role: "Dental hygienist", bio: "" },
  ],
  services: [
    {
      id: "checkup-cleaning",
      name: "Checkup and cleaning",
      description: "A routine cleaning.",
      durationMinutes: 60,
      price: "$120",
      providers: ["hannah-lee"],
    },
    {
      id: "root-canal",
      name: "Root canal",
      description: "Saves the tooth.",
      durationMinutes: 90,
      price: "from $950",
      providers: ["dr-okafor"],
    },
  ],
  insurance: {
    inNetwork: ["Delta Dental PPO", "MetLife"],
    notAccepted: ["Medicaid"],
    notes: "",
  },
  languages: ["English", "Spanish"],
};

const CLEANING: KnowledgeEntry = {
  id: "service:checkup-cleaning",
  title: "Checkup and cleaning",
  content: "Checkup and cleaning: a routine cleaning. It takes about 60 minutes and costs $120.",
  keywords: [],
  source: "clinic",
  serviceId: "checkup-cleaning",
};

export const ENTRIES: KnowledgeEntry[] = [
  CLEANING,
  {
    id: "faq:parking-and-getting-here",
    title: "Parking and getting here",
    content: "Free parking in the lot behind the building.",
    keywords: ["park", "car"],
    source: "faq",
  },
];

export const FOUND: SearchResponse = {
  query: "How much is a cleaning?",
  found: true,
  terms: ["price", "cleaning"],
  coverage: 1,
  hits: [{ ...CLEANING, score: 3.9 }],
  toolResult: {
    found: true,
    answers: [{ topic: CLEANING.title, answer: CLEANING.content, serviceId: "checkup-cleaning" }],
  },
};

export const NOT_FOUND: SearchResponse = {
  query: "Do you offer botox?",
  found: false,
  terms: ["offer", "botox"],
  coverage: 0.35,
  hits: [],
  toolResult: { found: false, instruction: "This is not in the clinic's knowledge base." },
};
