import { db } from "../db/client";
import { events } from "../db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  const all = await db
    .select({
      count: sql<number>`count(*)::int`,
      hasCats: sql<number>`count(*) filter (where array_length(categories,1) > 0)::int`,
    })
    .from(events)
    .where(eq(events.source, "luma"));
  console.log("Luma totals:", all[0]);

  const sample = await db
    .select({ title: events.title, city: events.city, categories: events.categories })
    .from(events)
    .where(eq(events.source, "luma"))
    .limit(15);
  console.log("\nSample:");
  for (const e of sample) {
    const cats = e.categories.length ? "[" + e.categories.join(", ") + "]" : "[uncategorized]";
    console.log(`  ${e.city.padEnd(8)} ${cats} ${e.title}`);
  }
  process.exit(0);
}
main();
