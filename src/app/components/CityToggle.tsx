"use client";
import { CITIES, CITY_LABELS, type City } from "../../../config";

export function CityToggle({
  city,
  onChange,
}: {
  city: City;
  onChange: (c: City) => void;
}) {
  return (
    <div className="flex rounded-lg border border-neutral-800 p-0.5">
      {CITIES.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`rounded-md px-3 py-1.5 text-sm transition ${
            city === c
              ? "bg-neutral-100 text-neutral-900"
              : "text-neutral-400 hover:text-neutral-100"
          }`}
        >
          {CITY_LABELS[c]}
        </button>
      ))}
    </div>
  );
}
