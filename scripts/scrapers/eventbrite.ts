import { chromium, type Browser } from "playwright";
import type { City } from "../../config";
import { CITY_META } from "../../config";
import type { NormalizedEvent } from "../types";
import { TECH_SEARCH_QUERIES, withinWindow } from "./shared";

// Eventbrite's public API was retired. They also removed JSON-LD <script> tags
// from search pages. Current shape: server-renders a window.__SERVER_DATA__
// blob containing search_data.events.{pagination,results[]}.
const SEARCH_URL = (location: string, query: string, page: number) =>
  `https://www.eventbrite.com/d/${location}/${encodeURIComponent(query)}/?page=${page}`;

interface EbResult {
  id?: string;
  name?: string;
  summary?: string;
  full_description?: string;
  url?: string;
  start_date?: string; // "YYYY-MM-DD" local
  start_time?: string; // "HH:MM"
  end_date?: string;
  end_time?: string;
  timezone?: string;
  is_cancelled?: boolean;
  primary_venue?: {
    name?: string;
    address?: { localized_address_display?: string; city?: string };
  };
  primary_organizer?: { name?: string };
  tickets_by?: string;
  image?: { url?: string };
}

interface EbServerData {
  search_data?: {
    events?: {
      results?: EbResult[];
      pagination?: { page_count?: number; page_number?: number };
    };
  };
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
      for (let pageNum = 1; pageNum <= 8; pageNum++) {
        const page = await ctx.newPage();
        let stopQuery = false;
        try {
          await page.goto(SEARCH_URL(meta.eventbriteLocation, q, pageNum), {
            waitUntil: "domcontentloaded",
            timeout: 30_000,
          });
          const html = await page.content();
          const data = extractServerData(html);
          const results = data?.search_data?.events?.results ?? [];
          if (results.length === 0) {
            stopQuery = true;
          } else if (results.every((r) => !r.start_date || !withinWindow(r.start_date))) {
            // Listings are date-sorted ascending; once every event on a page is past
            // the window, deeper pages will also be out-of-window.
            stopQuery = true;
          }
          for (const ev of results) {
            if (!ev.url || !ev.name || !ev.start_date) continue;
            if (ev.is_cancelled) continue;
            if (!withinWindow(ev.start_date)) continue;
            const time = ev.start_time ? `${ev.start_time}:00` : "00:00:00";
            const endTime = ev.end_time ? `${ev.end_time}:00` : null;
            const venueName = ev.primary_venue?.name;
            const venueAddr = ev.primary_venue?.address?.localized_address_display;
            const venue = [venueName, venueAddr].filter(Boolean).join(" — ") || null;
            const organizer = ev.primary_organizer?.name ?? null;
            byUrl.set(ev.url, {
              title: ev.name,
              description: ev.summary ?? ev.full_description ?? "",
              date: ev.start_date,
              time,
              endTime,
              city,
              venue,
              url: ev.url,
              source: "eventbrite",
              organizer,
              imageUrl: ev.image?.url ?? null,
            });
          }
        } catch (err) {
          console.warn(`[eventbrite] ${city} q="${q}" p${pageNum}: ${(err as Error).message}`);
        } finally {
          await page.close();
        }
        if (stopQuery) break;
      }
    }
  } finally {
    await ctx.close();
    if (owns) await b.close();
  }
  return Array.from(byUrl.values());
}

// Pulls the top-level { ... } object assigned to window.__SERVER_DATA__.
// We can't regex a balanced JSON with `.*?`, so walk braces manually.
function extractServerData(html: string): EbServerData | null {
  const marker = "window.__SERVER_DATA__";
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) return null;
  const eq = html.indexOf("=", markerIdx);
  if (eq === -1) return null;
  const braceStart = html.indexOf("{", eq);
  if (braceStart === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = braceStart; i < html.length; i++) {
    const c = html[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\") {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(braceStart, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
