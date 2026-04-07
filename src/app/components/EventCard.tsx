"use client";
import type { Event } from "../../../db/schema";

const SOURCE_COLORS: Record<string, string> = {
  luma: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  eventbrite: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  meetup: "bg-red-500/20 text-red-300 border-red-500/30",
};

function formatDate(dateStr: string, time: string | null): string {
  const d = new Date(`${dateStr}T${time ?? "00:00:00"}`);
  const dateStr2 = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  if (!time) return dateStr2;
  const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${dateStr2} · ${timeStr}`;
}

export function EventCard({ event, onOpen }: { event: Event; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      className="group relative cursor-pointer rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 transition hover:border-neutral-700 hover:bg-neutral-900"
    >
      <div className="flex items-start justify-between gap-3 pr-7">
        <h3 className="flex-1 text-sm font-medium leading-tight text-neutral-100">{event.title}</h3>
        <span
          className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
            SOURCE_COLORS[event.source] ?? "bg-neutral-800 text-neutral-400 border-neutral-700"
          }`}
        >
          {event.source}
        </span>
      </div>
      <div className="mt-2 text-xs text-neutral-400">{formatDate(event.date, event.time)}</div>
      {event.venue && <div className="mt-1 text-xs text-neutral-500">{event.venue}</div>}
      {event.categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {event.categories.map((c) => (
            <span
              key={c}
              className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-300"
            >
              {c}
            </span>
          ))}
        </div>
      )}
      <a
        href={event.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Open event page in new tab"
        className="absolute bottom-2 right-2 rounded-md p-1.5 text-neutral-500 opacity-0 transition hover:bg-neutral-800 hover:text-neutral-100 group-hover:opacity-100"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 17L17 7M7 7h10v10" />
        </svg>
      </a>
    </div>
  );
}
