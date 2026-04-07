import { chromium, type Browser } from "playwright";
import type { City } from "../../config";
import { CITY_META } from "../../config";
import type { NormalizedEvent } from "../types";
import { withinWindow } from "./shared";

// Luma exposes a JSON payload in __NEXT_DATA__ on discover pages.
// We read it via Playwright to avoid getting blocked by bot detection on raw fetch.
const DISCOVER_URL = (slug: string) => `https://lu.ma/${slug}`;

interface LumaApiEvent {
  api_id: string;
  name: string;
  description?: string;
  start_at?: string; // ISO
  end_at?: string;
  url?: string;
  cover_url?: string;
  geo_address_info?: { full_address?: string; address?: string };
  hosts?: Array<{ name?: string }>;
}

export async function scrapeLuma(city: City, browser?: Browser): Promise<NormalizedEvent[]> {
  const meta = CITY_META[city];
  const owns = !browser;
  const b = browser ?? (await chromium.launch({ headless: true }));
  const page = await b.newPage({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36",
  });

  const events: NormalizedEvent[] = [];
  try {
    await page.goto(DISCOVER_URL(meta.lumaSlug), { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForSelector("script#__NEXT_DATA__", { timeout: 10_000 }).catch(() => null);
    const nextData = await page
      .locator("script#__NEXT_DATA__")
      .first()
      .textContent({ timeout: 5000 })
      .catch(() => null);

    if (nextData) {
      const parsed = JSON.parse(nextData);
      const items = extractLumaEvents(parsed);
      for (const ev of items) {
        if (!ev.api_id || !ev.name || !ev.start_at) continue;
        if (!withinWindow(ev.start_at)) continue;
        const d = new Date(ev.start_at);
        const endD = ev.end_at ? new Date(ev.end_at) : null;
        events.push({
          title: ev.name,
          description: ev.description ?? "",
          date: d.toISOString().slice(0, 10),
          time: d.toISOString().slice(11, 19),
          endTime: endD ? endD.toISOString().slice(11, 19) : null,
          city,
          venue: ev.geo_address_info?.full_address ?? ev.geo_address_info?.address ?? null,
          url: ev.url ?? `https://lu.ma/${ev.api_id}`,
          source: "luma",
          organizer: ev.hosts?.[0]?.name ?? null,
          imageUrl: ev.cover_url ?? null,
        });
      }
    }
  } catch (err) {
    console.warn(`[luma] ${city} error:`, (err as Error).message);
  } finally {
    await page.close();
    if (owns) await b.close();
  }
  return events;
}

// Luma's __NEXT_DATA__ has events nested inside pageProps. Walk the tree.
function extractLumaEvents(obj: unknown): LumaApiEvent[] {
  const out: LumaApiEvent[] = [];
  const seen = new Set<string>();
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    const rec = node as Record<string, unknown>;
    if (typeof rec.api_id === "string" && typeof rec.name === "string" && typeof rec.start_at === "string") {
      if (!seen.has(rec.api_id)) {
        seen.add(rec.api_id);
        out.push(rec as unknown as LumaApiEvent);
      }
    }
    for (const v of Object.values(rec)) walk(v);
  };
  walk(obj);
  return out;
}
