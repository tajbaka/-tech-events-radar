import "dotenv/config";
import { chromium } from "playwright";
import { db } from "../db/client";
import { events } from "../db/schema";
import type { Guest } from "../db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

interface LumaGuest {
  name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  linkedin_handle?: string;
  twitter_handle?: string;
  bio_short?: string;
}

async function main() {
  console.log("Fetching Luma events missing guest data…");
  const rows = await db
    .select({ id: events.id, url: events.url, title: events.title })
    .from(events)
    .where(and(eq(events.source, "luma"), isNull(events.guestCount)));

  console.log(`Found ${rows.length} events to enrich`);
  if (rows.length === 0) {
    process.exit(0);
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36",
  });

  let enriched = 0;
  try {
    for (const row of rows) {
      const url = row.url.startsWith("http") ? row.url : `https://lu.ma/${row.url}`;
      const page = await ctx.newPage();
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
        await page.waitForSelector("script#__NEXT_DATA__", { timeout: 8_000 }).catch(() => null);
        const nd = await page
          .locator("script#__NEXT_DATA__")
          .first()
          .textContent({ timeout: 5000 })
          .catch(() => null);

        if (!nd) {
          console.log(`  [skip] ${row.title} — no __NEXT_DATA__`);
          // Mark as enriched with 0 so we don't retry
          await db.update(events).set({ guestCount: 0, guests: [] }).where(eq(events.id, row.id));
          continue;
        }

        const data = JSON.parse(nd);
        const d = data?.props?.pageProps?.initialData?.data;
        const guestCount: number = d?.guest_count ?? d?.ticket_count ?? 0;
        const featuredRaw: LumaGuest[] = d?.featured_guests ?? [];
        const guests: Guest[] = featuredRaw
          .filter((g) => g.name || g.first_name)
          .map((g) => ({
            name: g.name || [g.first_name, g.last_name].filter(Boolean).join(" "),
            avatarUrl: g.avatar_url ?? null,
            linkedinHandle: g.linkedin_handle ?? null,
            twitterHandle: g.twitter_handle ?? null,
            bio: g.bio_short ?? null,
          }));

        await db
          .update(events)
          .set({ guestCount, guests })
          .where(eq(events.id, row.id));

        enriched++;
        console.log(`  [${enriched}/${rows.length}] ${row.title}: ${guestCount} guests, ${guests.length} featured`);
      } catch (err) {
        console.warn(`  [error] ${row.title}: ${(err as Error).message}`);
        await db.update(events).set({ guestCount: 0, guests: [] }).where(eq(events.id, row.id));
      } finally {
        await page.close();
      }
    }
  } finally {
    await ctx.close();
    await browser.close();
  }

  console.log(`\nDone — enriched ${enriched}/${rows.length} events`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Guest scrape failed:", err);
  process.exit(1);
});
