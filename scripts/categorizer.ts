import { CATEGORY_KEYWORDS, CATEGORIES, type Category } from "../config";
import type { NormalizedEvent, CategorizedEvent } from "./types";

export function categorize(event: NormalizedEvent): Category[] {
  const haystack = `${event.title} ${event.description}`.toLowerCase();
  const matched: Category[] = [];
  for (const category of CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      matched.push(category);
    }
  }
  return matched;
}

export function categorizeAll(events: NormalizedEvent[]): CategorizedEvent[] {
  return events.map((e) => ({ ...e, categories: categorize(e) }));
}
