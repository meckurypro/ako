// src/lib/calendar.ts

function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export interface IcsEventInput {
  title: string;
  description?: string;
  location?: string;
  startIso: string;
  durationHours?: number; // default 2
}

// Builds a standalone .ics file and triggers a download — works with
// Google Calendar, Apple Calendar, and Outlook without any backend or
// API key, since it's just a static file format every calendar app
// already knows how to import.
export function downloadIcsEvent({ title, description, location, startIso, durationHours = 2 }: IcsEventInput) {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  const uid = `${crypto.randomUUID()}@ako.app`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ako//Event//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(start.toISOString())}`,
    `DTEND:${toIcsDate(end.toISOString())}`,
    `SUMMARY:${icsEscape(title)}`,
    location ? `LOCATION:${icsEscape(location)}` : null,
    description ? `DESCRIPTION:${icsEscape(description)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null);

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, "-").slice(0, 40)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
