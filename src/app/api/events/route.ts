import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../db/client";
import { events as eventsTable } from "../../../../db/schema";
import { and, eq, gte, lte, asc, inArray, arrayOverlaps } from "drizzle-orm";
import { CITIES, SOURCES, type City, type Source } from "../../../../config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cityParam = searchParams.get("city") ?? "toronto";
  if (!CITIES.includes(cityParam as City)) {
    return NextResponse.json({ error: "invalid city" }, { status: 400 });
  }
  const city = cityParam as City;
  const start = searchParams.get("start") ?? new Date().toISOString().slice(0, 10);
  const end =
    searchParams.get("end") ??
    new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  const categoriesParam = searchParams.get("categories");
  const filterCategories = categoriesParam?.split(",").filter(Boolean) ?? [];
  const sourcesParam = searchParams.get("sources");
  const filterSources = (sourcesParam?.split(",").filter(Boolean) ?? []).filter(
    (s): s is Source => SOURCES.includes(s as Source),
  );

  const where = and(
    eq(eventsTable.city, city),
    gte(eventsTable.date, start),
    lte(eventsTable.date, end),
    filterCategories.length > 0 ? arrayOverlaps(eventsTable.categories, filterCategories) : undefined,
    filterSources.length > 0 ? inArray(eventsTable.source, filterSources) : undefined,
  );

  const rows = await db
    .select()
    .from(eventsTable)
    .where(where)
    .orderBy(asc(eventsTable.date), asc(eventsTable.time));

  return NextResponse.json({ events: rows });
}
