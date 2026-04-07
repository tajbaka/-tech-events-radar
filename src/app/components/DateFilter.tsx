"use client";

interface DateRange {
  label: string;
  start: string; // YYYY-MM-DD
  end: string;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

export type DatePreset = "today" | "tomorrow" | "7" | "14" | "30" | "custom";

export function DateFilter({
  preset,
  customStart,
  customEnd,
  onChange,
}: {
  preset: DatePreset;
  customStart: string;
  customEnd: string;
  onChange: (p: DatePreset, start?: string, end?: string) => void;
}) {
  const today = new Date();
  const todayStr = toDateStr(today);
  const maxDate = toDateStr(addDays(today, 30));

  const presets: { key: DatePreset; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "tomorrow", label: "Tomorrow" },
    { key: "7", label: "7 days" },
    { key: "14", label: "14 days" },
    { key: "30", label: "30 days" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-neutral-500">Date</span>
      {presets.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`rounded-full border px-3 py-1 text-xs transition ${
            preset === p.key
              ? "border-neutral-100 bg-neutral-100 text-neutral-900"
              : "border-neutral-800 text-neutral-400 hover:text-neutral-100"
          }`}
        >
          {p.label}
        </button>
      ))}
      {preset === "custom" && (
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <input
            type="date"
            value={customStart}
            min={todayStr}
            max={maxDate}
            onChange={(e) => onChange("custom", e.target.value, customEnd)}
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-neutral-100"
          />
          <span>–</span>
          <input
            type="date"
            value={customEnd}
            min={customStart || todayStr}
            max={maxDate}
            onChange={(e) => onChange("custom", customStart, e.target.value)}
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-neutral-100"
          />
        </div>
      )}
    </div>
  );
}

export function getDateRange(preset: DatePreset, customStart: string, customEnd: string): { start: string; end: string } {
  const today = new Date();
  const todayStr = toDateStr(today);
  switch (preset) {
    case "today":
      return { start: todayStr, end: todayStr };
    case "tomorrow": {
      const tmr = toDateStr(addDays(today, 1));
      return { start: tmr, end: tmr };
    }
    case "7":
      return { start: todayStr, end: toDateStr(addDays(today, 7)) };
    case "14":
      return { start: todayStr, end: toDateStr(addDays(today, 14)) };
    case "30":
      return { start: todayStr, end: toDateStr(addDays(today, 30)) };
    case "custom":
      return { start: customStart || todayStr, end: customEnd || toDateStr(addDays(today, 14)) };
  }
}
