"use client";
import { CATEGORIES, type Category } from "../../../config";

export function CategoryFilter({
  active,
  onToggle,
  onClear,
}: {
  active: Category[];
  onToggle: (c: Category) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
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
      {CATEGORIES.map((c) => {
        const on = active.includes(c);
        return (
          <button
            key={c}
            onClick={() => onToggle(c)}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              on
                ? "border-neutral-100 bg-neutral-100 text-neutral-900"
                : "border-neutral-800 text-neutral-400 hover:text-neutral-100"
            }`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}
