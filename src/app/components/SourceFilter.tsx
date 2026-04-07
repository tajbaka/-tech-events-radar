"use client";
import { SOURCES, type Source } from "../../../config";

const SOURCE_LABELS: Record<Source, string> = {
  luma: "Luma",
  eventbrite: "Eventbrite",
  meetup: "Meetup",
};

export function SourceFilter({
  active,
  onToggle,
  onClear,
}: {
  active: Source[];
  onToggle: (s: Source) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-neutral-500">Platform</span>
      <button
        onClick={onClear}
        className={`rounded-full border px-3 py-1 text-xs transition ${
          active.length === 0
            ? "border-neutral-100 bg-neutral-100 text-neutral-900"
            : "border-neutral-800 text-neutral-400 hover:text-neutral-100"
        }`}
      >
        All
      </button>
      {SOURCES.map((s) => {
        const on = active.includes(s);
        return (
          <button
            key={s}
            onClick={() => onToggle(s)}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              on
                ? "border-neutral-100 bg-neutral-100 text-neutral-900"
                : "border-neutral-800 text-neutral-400 hover:text-neutral-100"
            }`}
          >
            {SOURCE_LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}
