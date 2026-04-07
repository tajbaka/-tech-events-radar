import { chromium, type Browser } from "playwright";
import type { City } from "../../config";
import { CITY_META } from "../../config";
import type { NormalizedEvent } from "../types";
import { TECH_SEARCH_QUERIES, withinWindow } from "./shared";

// Eventbrite's public API was retired. We scrape their HTML search pages instead.
// They embed event data as JSON-LD <script type="application/ld+json"> tags.
const SEARCH_URL = (location: string, query: string, page: number) =>
  `https://www.eventbrite.com/d/${location}/${encodeURIComponent(query)}/?page=${page}`;

interface JsonLdEvent {
  "@type"?: string | string[];
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  image?: string | { url?: string };
  location?: { name?: string; address?: { streetAddress?: string; addressLocality?: string } } | Array<unknown>;
  organizer?: { name?: string } | Array<{ name?: string }>;
}

function isEventType(t: JsonLdEvent["@type"]): boolean {
  if (!t) return false;
  if (Array.isArray(t)) return t.some((x) => typeof x === "string" && x.endsWith("Event"));
  return typeof t === "string" && t.endsWith("Event");
}

export async function scrapeEventbrite(city: City, browser?: Browser): Promise<NormalizedEvent[]> {
  const meta = CITY_META[city];
  const owns = !browser;
  const b = browser ?? (await chromium.launch({ headless: true }));
  const ctx = await b.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36",
  });

  const byUrl = new Map<string, NormalizedEvent>();
  try {
    for (const q of TECH_SEARCH_QUERIES) {
      for (let pageNum = 1; pageNum <= 2; pageNum++) {
        const page = await ctx.newPage();
        try {
          await page.goto(SEARCH_URL(meta.eventbriteLocation, q, pageNum), {
            waitUntil: "domcontentloaded",
            timeout: 30_000,
          });
          // JSON-LD scripts carry the structured event data.
          const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
          const events = parseJsonLdEvents(scripts);
          if (events.length === 0) break;
          for (const ev of events) {
            if (!ev.url || !ev.name || !ev.startDate) continue;
            if (!withinWindow(ev.startDate)) continue;
            const d = new Date(ev.startDate);
            const endD = ev.endDate ? new Date(ev.endDate) : null;
            const loc = Array.isArray(ev.location) ? undefined : ev.location;
            const venueName = loc?.name;
            const venueAddr = [loc?.address?.streetAddress, loc?.address?.addressLocality]
              .filter(Boolean)
              .join(", ");
            const venue = [venueName, venueAddr].filter(Boolean).join(" — ") || null;
            const organizer = Array.isArray(ev.organizer)
              ? ev.organizer[0]?.name
              : ev.organizer?.name;
            const image = typeof ev.image === "string" ? ev.image : ev.image?.url ?? null;
            byUrl.set(ev.url, {
              title: ev.name,
              description: ev.description ?? "",
              date: d.toISOString().slice(0, 10),
              time: d.toISOString().slice(11, 19),
              endTime: endD ? endD.toISOString().slice(11, 19) : null,
              city,
              venue,
              url: ev.url,
              source: "eventbrite",
              organizer: organizer ?? null,
              imageUrl: image,
            });
          }
        } catch (err) {
          console.warn(`[eventbrite] ${city} q="${q}" p${pageNum}: ${(err as Error).message}`);
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await ctx.close();
    if (owns) await b.close();
  }
  return Array.from(byUrl.values());
}

function parseJsonLdEvents(scripts: string[]): JsonLdEvent[] {
  const out: JsonLdEvent[] = [];
  for (const raw of scripts) {
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item) continue;
        // Some pages wrap events in an ItemList with itemListElement.
        if (Array.isArray(item.itemListElement)) {
          for (const entry of item.itemListElement) {
            const node = (entry?.item ?? entry) as JsonLdEvent;
            if (isEventType(node["@type"])) out.push(node);
          }
        } else if (isEventType(item["@type"])) {
          out.push(item as JsonLdEvent);
        }
      }
    } catch {
      // skip invalid JSON-LD
    }
  }
  return out;
}
