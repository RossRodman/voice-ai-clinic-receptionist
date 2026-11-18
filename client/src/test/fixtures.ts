import type {
  Appointment,
  AvailabilityToolResult,
  Clinic,
  KnowledgeEntry,
  ScheduleResponse,
  SearchResponse,
} from "@/types";

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
  booking: { slotMinutes: 30, minNoticeMinutes: 120, maxDaysAhead: 60 },
  calendar: "demo",
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

const slot = (date: string, time: string, label: string, providerIds = ["hannah-lee"]) => ({
  start: `${date}T${time}:00-06:00`,
  time,
  label,
  providerIds,
});

export const SCHEDULE: ScheduleResponse = {
  calendar: "demo",
  today: "2026-11-17",
  days: [
    {
      date: "2026-11-17",
      label: "Tuesday, November 17",
      closed: false,
      slots: [slot("2026-11-17", "12:00", "noon"), slot("2026-11-17", "14:00", "2 PM")],
    },
    { date: "2026-11-18", label: "Wednesday, November 18", closed: false, slots: [] },
    {
      date: "2026-11-19",
      label: "Thursday, November 19",
      closed: false,
      slots: [slot("2026-11-19", "08:00", "8 AM"), slot("2026-11-19", "09:30", "9:30 AM")],
    },
    { date: "2026-11-20", label: "Friday, November 20", closed: false, slots: [] },
    { date: "2026-11-21", label: "Saturday, November 21", closed: false, slots: [] },
    { date: "2026-11-22", label: "Sunday, November 22", closed: true, slots: [] },
    { date: "2026-11-23", label: "Monday, November 23", closed: false, slots: [] },
  ],
};

export const AVAILABILITY: AvailabilityToolResult = {
  today: "Tuesday, November 17",
  service: "Checkup and cleaning",
  durationMinutes: 60,
  slots: [
    {
      start: "2026-11-17T12:00:00-06:00",
      spoken: "Tuesday, November 17 at noon",
      provider: "Hannah Lee",
      providerId: "hannah-lee",
    },
    {
      start: "2026-11-19T08:00:00-06:00",
      spoken: "Thursday, November 19 at 8 AM",
      provider: "Hannah Lee",
      providerId: "hannah-lee",
    },
  ],
  instruction: "Offer two or three of these times, saying the day and the time.",
};

export const CLOSED_SUNDAY: AvailabilityToolResult = {
  ...AVAILABILITY,
  requestedDate: "2026-11-22",
  requestedDateAvailable: false,
  note: "The clinic is closed on Sundays.",
  slots: [
    {
      start: "2026-11-23T08:00:00-06:00",
      spoken: "Monday, November 23 at 8 AM",
      provider: "Hannah Lee",
      providerId: "hannah-lee",
    },
  ],
};

export const APPOINTMENT: Appointment = {
  id: "evt_1",
  serviceId: "checkup-cleaning",
  service: "Checkup and cleaning",
  providerId: "hannah-lee",
  provider: "Hannah Lee",
  start: "2026-11-19T08:00:00-06:00",
  end: "2026-11-19T09:00:00-06:00",
  spoken: "Thursday, November 19 at 8 AM",
  durationMinutes: 60,
  patientName: "Maria Lopez",
  patientPhone: "+15551234567",
  newPatient: true,
  notes: "Sensitive teeth",
  callId: "call_1",
};
