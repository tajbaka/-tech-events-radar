import "dotenv/config";
import { chromium } from "playwright";
import { db } from "../db/client";
import { events as eventsTable, scrapeRuns } from "../db/schema";
import { sql } from "drizzle-orm";
import { CITIES, SOURCES, type City, type Source } from "../config";
import type { NormalizedEvent, CategorizedEvent } from "./types";
import { categorizeAll } from "./categorizer";
import { dedupe } from "./deduper";
import { checkHealth, formatHealthSummary, type HealthResult } from "./healthCheck";
import { scrapeEventbrite } from "./scrapers/eventbrite";
import { scrapeLuma } from "./scrapers/luma";
import { scrapeMeetup } from "./scrapers/meetup";

async function runSource(
  source: Source,
  city: City,
  browser: Awaited<ReturnType<typeof chromium.launch>>,
): Promise<NormalizedEvent[]> {
  try {
    switch (source) {
      case "eventbrite":
        return await scrapeEventbrite(city, browser);
      case "luma":
        return await scrapeLuma(city, browser);
      case "meetup":
        return await scrapeMeetup(city, browser);
    }
  } catch (err) {
    console.error(`[${source}] ${city} failed:`, (err as Error).message);
    return [];
  }
}

async function upsertEvents(events: CategorizedEvent[]): Promise<number> {
  if (events.length === 0) return 0;
  const rows = events.map((e) => ({
    title: e.title,
    description: e.description,
    date: e.date,
    time: e.time,
    endTime: e.endTime,
    city: e.city,
    venue: e.venue,
    url: e.url,
    source: e.source,
    categories: e.categories,
    organizer: e.organizer,
    imageUrl: e.imageUrl,
    scrapedAt: new Date(),
  }));
  // Batch to avoid pg param limits (~65k; each row has 12 params so batch 1000 rows is safe).
  const batchSize = 500;
  let written = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const result = await db
      .insert(eventsTable)
      .values(batch)
      .onConflictDoUpdate({
        target: [eventsTable.title, eventsTable.date, eventsTable.city],
        set: {
          description: sql`excluded.description`,
          time: sql`excluded.time`,
          endTime: sql`excluded.end_time`,
          venue: sql`excluded.venue`,
          url: sql`excluded.url`,
          source: sql`excluded.source`,
          categories: sql`excluded.categories`,
          organizer: sql`excluded.organizer`,
          imageUrl: sql`excluded.image_url`,
          scrapedAt: sql`excluded.scraped_at`,
        },
      });
    written += batch.length;
    void result;
  }
  return written;
}

async function main() {
  console.log(`Starting scrape at ${new Date().toISOString()}`);
  const browser = await chromium.launch({ headless: true });

  const healthResults: HealthResult[] = [];
  const allEvents: NormalizedEvent[] = [];

  try {
    for (const source of SOURCES) {
      for (const city of CITIES) {
        const t0 = Date.now();
        const events = await runSource(source, city, browser);
        const ms = Date.now() - t0;
        console.log(`[${source}] ${city}: ${events.length} events (${ms}ms)`);

        const health = await checkHealth(source, city, events.length);
        healthResults.push(health);

        await db.insert(scrapeRuns).values({
          source,
          city,
          eventCount: events.length,
          status: health.status,
        });

        allEvents.push(...events);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\nTotal raw events: ${allEvents.length}`);
  const categorized = categorizeAll(allEvents);
  const deduped = dedupe(categorized);
  console.log(`After dedup: ${deduped.length}`);

  const written = await upsertEvents(deduped);
  console.log(`Upserted: ${written}`);

  console.log("\n" + formatHealthSummary(healthResults));

  const degraded = healthResults.filter((r) => r.status !== "healthy");
  if (degraded.length > 0) {
    console.warn(`\n⚠️  ${degraded.length} source/city combos flagged`);
    if (process.env.SLACK_WEBHOOK_URL) {
      const { sendHealthAlert } = await import("./slack");
      await sendHealthAlert(degraded);
    }
  }

  if (process.env.SLACK_WEBHOOK_URL) {
    const { sendDigest } = await import("./slack");
    await sendDigest(deduped);
  }

  console.log(`\nDone at ${new Date().toISOString()}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Scrape failed:", err);
  process.exit(1);
});
