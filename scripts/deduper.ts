import type { CategorizedEvent } from "./types";
import type { Source } from "../config";

// Prefer richer sources when the same event appears multiple times.
const SOURCE_PRIORITY: Record<Source, number> = {
  luma: 3,
  eventbrite: 2,
  meetup: 1,
};

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupKey(e: { title: string; date: string; city: string }): string {
  return `${e.city}|${e.date}|${normalizeTitle(e.title)}`;
}

export function dedupe(events: CategorizedEvent[]): CategorizedEvent[] {
  const byKey = new Map<string, CategorizedEvent>();
  for (const event of events) {
    const key = dedupKey(event);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, event);
      continue;
    }
    // Keep the higher-priority source; merge categories union.
    const winner =
      SOURCE_PRIORITY[event.source] >= SOURCE_PRIORITY[existing.source] ? event : existing;
    const loser = winner === event ? existing : event;
    const mergedCategories = Array.from(new Set([...winner.categories, ...loser.categories]));
    byKey.set(key, { ...winner, categories: mergedCategories });
  }
  return Array.from(byKey.values());
}
