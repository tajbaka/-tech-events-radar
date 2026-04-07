import { chromium, type Browser } from "playwright";
import type { City } from "../../config";
import { CITY_META } from "../../config";
import type { NormalizedEvent } from "../types";
import { TECH_SEARCH_QUERIES, withinWindow } from "./shared";

// Meetup's public GraphQL changed shape; scrape their /find HTML pages instead.
// Event cards embed JSON-LD Event objects.
const FIND_URL = (lat: number, lon: number, q: string) =>
  `https://www.meetup.com/find/?source=EVENTS&keywords=${encodeURIComponent(q)}&lat=${lat}&lon=${lon}&distance=tenMiles`;

interface JsonLdEvent {
  "@type"?: string | string[];
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  image?: string | { url?: string } | string[];
  location?: { name?: string; address?: { streetAddress?: string; addressLocality?: string } } | Array<unknown>;
  organizer?: { name?: string } | Array<{ name?: string }>;
}

function isEventType(t: JsonLdEvent["@type"]): boolean {
  if (!t) return false;
  if (Array.isArray(t)) return t.some((x) => typeof x === "string" && x.endsWith("Event"));
  return typeof t === "string" && t.endsWith("Event");
}

export async function scrapeMeetup(city: City, browser?: Browser): Promise<NormalizedEvent[]> {
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
      const page = await ctx.newPage();
      try {
        await page.goto(FIND_URL(meta.lat, meta.lng, q), {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
        for (const raw of scripts) {
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            const items = Array.isArray(parsed) ? parsed : [parsed];
            for (const item of items) {
              const events: JsonLdEvent[] = [];
              if (Array.isArray(item?.itemListElement)) {
                for (const entry of item.itemListElement) {
                  const node = (entry?.item ?? entry) as JsonLdEvent;
                  if (isEventType(node["@type"])) events.push(node);
                }
              } else if (isEventType(item?.["@type"])) {
                events.push(item as JsonLdEvent);
              }
              for (const ev of events) {
                if (!ev.url || !ev.name || !ev.startDate) continue;
                if (!withinWindow(ev.startDate)) continue;
                const d = new Date(ev.startDate);
                const endD = ev.endDate ? new Date(ev.endDate) : null;
                const loc = Array.isArray(ev.location) ? undefined : ev.location;
                const venue = [
                  loc?.name,
                  [loc?.address?.streetAddress, loc?.address?.addressLocality].filter(Boolean).join(", "),
                ]
                  .filter(Boolean)
                  .join(" — ") || null;
                const organizer = Array.isArray(ev.organizer)
                  ? ev.organizer[0]?.name
                  : ev.organizer?.name;
                const image = Array.isArray(ev.image)
                  ? ev.image[0]
                  : typeof ev.image === "string"
                    ? ev.image
                    : ev.image?.url ?? null;
                byUrl.set(ev.url, {
                  title: ev.name,
                  description: ev.description ?? "",
                  date: d.toISOString().slice(0, 10),
                  time: d.toISOString().slice(11, 19),
                  endTime: endD ? endD.toISOString().slice(11, 19) : null,
                  city,
                  venue,
                  url: ev.url,
                  source: "meetup",
                  organizer: organizer ?? null,
                  imageUrl: image,
                });
              }
            }
          } catch {
            // skip invalid JSON-LD
          }
        }
      } catch (err) {
        console.warn(`[meetup] ${city} q="${q}": ${(err as Error).message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await ctx.close();
    if (owns) await b.close();
  }
  return Array.from(byUrl.values());
}
