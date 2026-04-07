import { db } from "../db/client";
import { scrapeRuns } from "../db/schema";
import { desc, eq, and } from "drizzle-orm";
import type { City, Source } from "../config";

export type HealthStatus = "healthy" | "degraded" | "suspicious";

export interface HealthResult {
  source: Source;
  city: City;
  count: number;
  status: HealthStatus;
  previous: number | null;
  note?: string;
}

export async function checkHealth(
  source: Source,
  city: City,
  count: number,
): Promise<HealthResult> {
  // Look up the most recent prior run for this source+city.
  const prior = await db
    .select()
    .from(scrapeRuns)
    .where(and(eq(scrapeRuns.source, source), eq(scrapeRuns.city, city)))
    .orderBy(desc(scrapeRuns.ranAt))
    .limit(1);

  const previous = prior[0]?.eventCount ?? null;

  if (count === 0) {
    return { source, city, count, status: "degraded", previous, note: "0 events" };
  }
  if (previous !== null && previous > 0) {
    const dropRatio = 1 - count / previous;
    if (dropRatio > 0.5) {
      return {
        source,
        city,
        count,
        status: "suspicious",
        previous,
        note: `dropped ${Math.round(dropRatio * 100)}% from ${previous}`,
      };
    }
  }
  return { source, city, count, status: "healthy", previous };
}

export function formatHealthSummary(results: HealthResult[]): string {
  const bySource = new Map<Source, HealthResult[]>();
  for (const r of results) {
    const arr = bySource.get(r.source) ?? [];
    arr.push(r);
    bySource.set(r.source, arr);
  }
  const lines: string[] = ["Scrape complete:"];
  for (const [source, rows] of bySource) {
    const worst: HealthStatus = rows.some((r) => r.status === "suspicious")
      ? "suspicious"
      : rows.some((r) => r.status === "degraded")
        ? "degraded"
        : "healthy";
    const byCity = rows
      .map((r) => `${r.city.toUpperCase()}: ${r.count}`)
      .join(", ");
    const notes = rows
      .filter((r) => r.note)
      .map((r) => `${r.city}=${r.note}`)
      .join("; ");
    const pad = source.padEnd(11);
    const flag = worst === "healthy" ? "healthy" : worst;
    lines.push(`  ${pad} ${flag.padEnd(11)} (${byCity})${notes ? ` <- ${notes}` : ""}`);
  }
  return lines.join("\n");
}
