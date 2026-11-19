const dayFormat = (options: Intl.DateTimeFormatOptions) => (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...options });

/** "Mon, Nov 16" */
export const dayLabel = dayFormat({ weekday: "short", month: "short", day: "numeric" });

/** "Mon" */
export const weekday = dayFormat({ weekday: "short" });

/** "Nov 16" */
export const shortDate = dayFormat({ month: "short", day: "numeric" });

export const percent = (rate: number) => `${Math.round(rate * 100)}%`;

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
