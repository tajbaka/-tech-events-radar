import { pgTable, uuid, text, date, time, timestamp, integer, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    date: date("date").notNull(),
    time: time("time"),
    endTime: time("end_time"),
    city: text("city").notNull(),
    venue: text("venue"),
    url: text("url").notNull(),
    source: text("source").notNull(),
    categories: text("categories").array().notNull().default([]),
    organizer: text("organizer"),
    imageUrl: text("image_url"),
    guestCount: integer("guest_count"),
    guests: jsonb("guests").$type<Guest[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    cityDateIdx: index("events_city_date_idx").on(t.city, t.date),
    // Dedup key: same event across sources matched on title+date+city
    dedupIdx: uniqueIndex("events_dedup_idx").on(t.title, t.date, t.city),
  }),
);

export const scrapeRuns = pgTable("scrape_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  city: text("city").notNull(),
  eventCount: integer("event_count").notNull(),
  status: text("status").notNull(), // healthy | degraded | suspicious
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
});

export interface Guest {
  name: string;
  avatarUrl: string | null;
  linkedinHandle: string | null;
  twitterHandle: string | null;
  bio: string | null;
}

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type ScrapeRun = typeof scrapeRuns.$inferSelect;
export type NewScrapeRun = typeof scrapeRuns.$inferInsert;
