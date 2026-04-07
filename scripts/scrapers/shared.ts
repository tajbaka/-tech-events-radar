// Search keywords used across scrapers to filter for tech events.
export const TECH_SEARCH_QUERIES = [
  "tech",
  "ai",
  "startup",
  "developer",
  "hackathon",
  "founder",
];

export function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function toTimeString(d: Date): string {
  return d.toISOString().slice(11, 19);
}

// Guard helper — most scrapers look 60 days out max.
export function withinWindow(dateIso: string, days = 60): boolean {
  const now = Date.now();
  const limit = now + days * 24 * 60 * 60 * 1000;
  const t = Date.parse(dateIso);
  return Number.isFinite(t) && t >= now - 24 * 60 * 60 * 1000 && t <= limit;
}
