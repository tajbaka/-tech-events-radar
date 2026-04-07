"use client";

import { useEffect, useMemo, useState } from "react";
import { CityToggle } from "./components/CityToggle";
import { CategoryFilter } from "./components/CategoryFilter";
import { SourceFilter } from "./components/SourceFilter";
import { DateFilter, getDateRange, type DatePreset } from "./components/DateFilter";
import { EventCard } from "./components/EventCard";
import { EventModal } from "./components/EventModal";
import { VoiceGreeting } from "./components/VoiceGreeting";
import type { City, Category, Source } from "../../config";
import type { Event } from "../../db/schema";

export default function Page() {
  const [city, setCity] = useState<City>("toronto");
  const [categories, setCategories] = useState<Category[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>("14");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Event | null>(null);
  const [hideVirtual, setHideVirtual] = useState(false);

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

  const toggleCategory = (c: Category) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const toggleSource = (s: Source) =>
    setSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const handleDateChange = (p: DatePreset, s?: string, e?: string) => {
    setDatePreset(p);
    if (s !== undefined) setCustomStart(s);
    if (e !== undefined) setCustomEnd(e);
  };

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
        <SourceFilter active={sources} onToggle={toggleSource} onClear={() => setSources([])} />
      </div>
      <div className="mb-3">
        <CategoryFilter
          active={categories}
          onToggle={toggleCategory}
          onClear={() => setCategories([])}
        />
      </div>
      <div className="mb-6 flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
          <input
            type="checkbox"
            checked={hideVirtual}
            onChange={(e) => setHideVirtual(e.target.checked)}
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
