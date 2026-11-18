import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "must be HH:MM, 24-hour");

const openingRange = z
  .tuple([time, time])
  .refine(([open, close]) => open < close, "opens after it closes");

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const price = z.object({
  amount: z.number().min(0),
  from: z.boolean().optional(),
  note: z.string().optional(),
});

const provider = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  title: z.string().min(1),
  role: z.string().min(1),
  bio: z.string().min(1),
});

const booking = z.object({
  slotMinutes: z.number().int().min(5).max(240).default(30),
  minNoticeMinutes: z.number().int().min(0).default(120),
  maxDaysAhead: z.number().int().min(1).max(365).default(60),
});

const service = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "must be kebab-case"),
  name: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  price,
  providers: z.array(z.string()).min(1),
  description: z.string().min(1),
  keywords: z.array(z.string()).default([]),
});

export const clinicSchema = z
  .object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.email(),
    address: z.string().min(1),
    website: z.string().min(1),
    timezone: z.string().refine((tz) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "is not an IANA time zone"),
    booking: booking.default({ slotMinutes: 30, minNoticeMinutes: 120, maxDaysAhead: 60 }),
    hours: z.object(
      Object.fromEntries(WEEKDAYS.map((day) => [day, z.array(openingRange)])) as Record<
        Weekday,
        z.ZodArray<typeof openingRange>
      >,
    ),
    providers: z.array(provider).min(1),
    services: z.array(service).min(1),
    insurance: z.object({
      inNetwork: z.array(z.string()),
      notAccepted: z.array(z.string()),
      notes: z.string(),
    }),
    languages: z.array(z.string()).min(1),
  })
  .superRefine((clinic, ctx) => {
    const providerIds = new Set(clinic.providers.map((p) => p.id));
    const serviceIds = new Set<string>();
    clinic.services.forEach((s, i) => {
      if (serviceIds.has(s.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["services", i, "id"],
          message: `duplicate "${s.id}"`,
        });
      }
      serviceIds.add(s.id);
      s.providers.forEach((id, j) => {
        if (!providerIds.has(id)) {
          ctx.addIssue({
            code: "custom",
            path: ["services", i, "providers", j],
            message: `unknown provider "${id}"`,
          });
        }
      });
    });
  });

export type Clinic = z.infer<typeof clinicSchema>;
export type Service = Clinic["services"][number];
export type Provider = Clinic["providers"][number];
export type Price = Service["price"];
export type BookingRules = Clinic["booking"];
