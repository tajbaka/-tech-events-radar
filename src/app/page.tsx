"use client";

import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CityToggle } from "./components/CityToggle";
import { CategoryFilter } from "./components/CategoryFilter";
import { SourceFilter } from "./components/SourceFilter";
import { DateFilter, getDateRange, type DatePreset } from "./components/DateFilter";
import { EventCard } from "./components/EventCard";
import { EventModal } from "./components/EventModal";
import { VoiceGreeting } from "./components/VoiceGreeting";
import { CITIES, SOURCES, CATEGORIES, type City, type Category, type Source } from "../../config";
import type { Event } from "../../db/schema";

const DATE_PRESETS: DatePreset[] = ["today", "tomorrow", "7", "14", "30", "custom"];

function useFilterParams() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const city = (CITIES as readonly string[]).includes(searchParams.get("city") ?? "")
    ? (searchParams.get("city") as City)
    : "toronto";

  const categoriesParam = searchParams.get("categories") ?? "";
  const categories = useMemo(
    () => categoriesParam.split(",").filter((c): c is Category => (CATEGORIES as readonly string[]).includes(c)),
    [categoriesParam],
  );

  const sourcesParam = searchParams.get("sources") ?? "";
  const sources = useMemo(
    () => sourcesParam.split(",").filter((s): s is Source => (SOURCES as readonly string[]).includes(s)),
    [sourcesParam],
  );

  const rawPreset = searchParams.get("date") ?? "14";
  const datePreset: DatePreset = DATE_PRESETS.includes(rawPreset as DatePreset)
    ? (rawPreset as DatePreset)
    : "14";

  const customStart = searchParams.get("start") ?? "";
  const customEnd = searchParams.get("end") ?? "";
  const hideVirtual = searchParams.get("hideVirtual") === "1";

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  return { city, categories, sources, datePreset, customStart, customEnd, hideVirtual, setParams };
}

function PageContent() {
  const { city, categories, sources, datePreset, customStart, customEnd, hideVirtual, setParams } =
    useFilterParams();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Event | null>(null);

  const setCity = (c: City) => setParams({ city: c === "toronto" ? null : c });
  const toggleCategory = (c: Category) => {
    const next = categories.includes(c) ? categories.filter((x) => x !== c) : [...categories, c];
    setParams({ categories: next.length > 0 ? next.join(",") : null });
  };
  const toggleSource = (s: Source) => {
    const next = sources.includes(s) ? sources.filter((x) => x !== s) : [...sources, s];
    setParams({ sources: next.length > 0 ? next.join(",") : null });
  };
  const handleDateChange = (p: DatePreset, s?: string, e?: string) => {
    setParams({
      date: p === "14" ? null : p,
      start: p === "custom" ? (s ?? customStart) || null : null,
      end: p === "custom" ? (e ?? customEnd) || null : null,
    });
  };
  const setHideVirtual = (v: boolean) => setParams({ hideVirtual: v ? "1" : null });

  const { start, end } = useMemo(
    () => getDateRange(datePreset, customStart, customEnd),
    [datePreset, customStart, customEnd],
  );

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ city, start, end });
    if (categories.length > 0) params.set("categories", categories.join(","));
    if (sources.length > 0) params.set("sources", sources.join(","));
    fetch(`/api/events?${params}`)
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .finally(() => setLoading(false));
  }, [city, categories, sources, start, end]);

  const VIRTUAL_KEYWORDS = /\b(online|virtual|zoom|remote|webinar|livestream|live stream|google meet|microsoft teams)\b/i;

  const filtered = useMemo(() => {
    if (!hideVirtual) return events;
    return events.filter((e) => {
      const venue = (e.venue ?? "").toLowerCase();
      const title = e.title.toLowerCase();
      const desc = e.description.toLowerCase();
      return !VIRTUAL_KEYWORDS.test(venue) && !VIRTUAL_KEYWORDS.test(title) && !VIRTUAL_KEYWORDS.test(desc);
    });
  }, [events, hideVirtual]);

  const grouped = useMemo(() => {
    const byDate = new Map<string, Event[]>();
    for (const e of filtered) {
      const arr = byDate.get(e.date) ?? [];
      arr.push(e);
      byDate.set(e.date, arr);
    }
    return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <VoiceGreeting />
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tech Events Radar</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Tech networking events in Toronto, SF, and NYC
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <CityToggle city={city} onChange={setCity} />
      </div>

      <div className="mb-3">
        <DateFilter
          preset={datePreset}
          customStart={customStart}
          customEnd={customEnd}
          onChange={handleDateChange}
        />
      </div>
      <div className="mb-3">
        <SourceFilter active={sources} onToggle={toggleSource} onClear={() => setParams({ sources: null })} />
      </div>
      <div className="mb-3">
        <CategoryFilter
          active={categories}
          onToggle={toggleCategory}
          onClear={() => setParams({ categories: null })}
        />
      </div>
      <div className="mb-6 flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
          <input
            type="checkbox"
            checked={hideVirtual}
            onChange={(e) => setHideVirtual(e.target.checked as boolean)}
            className="h-3.5 w-3.5 rounded border-neutral-700 bg-neutral-900 accent-neutral-100"
          />
          Hide virtual events
        </label>
        {hideVirtual && filtered.length < events.length && (
          <span className="text-[11px] text-neutral-600">
            ({events.length - filtered.length} hidden)
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-neutral-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-neutral-500">
          No events found for this city / filter
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([date, dayEvents]) => (
            <section key={date}>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {dayEvents.map((e) => (
                  <EventCard key={e.id} event={e} onOpen={() => setSelected(e)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {selected && <EventModal event={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-neutral-500">Loading…</div>}>
      <PageContent />
    </Suspense>
  );
}
