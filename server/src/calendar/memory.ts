import type { CalendarClient, CalendarEvent, NewEvent } from "./types.ts";

export class InMemoryCalendar implements CalendarClient {
  readonly kind = "demo";
  private readonly events: CalendarEvent[] = [];
  private nextId = 1;

  constructor(events: Omit<CalendarEvent, "id">[] = []) {
    for (const event of events) {
      this.add(event);
    }
  }

  add(event: Omit<CalendarEvent, "id">): CalendarEvent {
    const created = { ...event, id: `evt_${this.nextId++}` };
    this.events.push(created);

    return created;
  }

  async listEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
    return this.events
      .filter((e) => e.start < to && e.end > from)
      .toSorted((a, b) => a.start.getTime() - b.start.getTime())
      .map((e) => structuredClone(e));
  }

  async createEvent({ summary, start, end, appointment }: NewEvent): Promise<CalendarEvent> {
    return structuredClone(
      this.add({ summary, start, end, providerId: appointment.providerId, appointment }),
    );
  }

  get size(): number {
    return this.events.length;
  }
}
