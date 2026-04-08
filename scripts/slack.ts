import type { CategorizedEvent } from "./types";
import { CITIES, CITY_LABELS, type City } from "../config";
import type { HealthResult } from "./healthCheck";

function formatEventLine(e: CategorizedEvent): string {
  const d = new Date(`${e.date}T${e.time ?? "00:00:00"}`);
  const when = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = e.time
    ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "";
  const parts = [`"${e.title}"`, e.source, when + (time ? `, ${time}` : "")];
  if (e.venue) parts.push(e.venue);
  return `- ${parts.join(" — ")}`;
}

function dateRangeLabel(events: CategorizedEvent[]): string {
  if (events.length === 0) return "";
  const dates = events.map((e) => e.date).sort();
  const first = new Date(dates[0] + "T00:00:00");
  const last = new Date(dates[dates.length - 1] + "T00:00:00");
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return first.getTime() === last.getTime() ? fmt(first) : `${fmt(first)}-${fmt(last)}`;
}

function buildCityDigest(city: City, events: CategorizedEvent[]): string | null {
  const cityEvents = events
    .filter((e) => e.city === city)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (cityEvents.length === 0) return null;

  const byCategory = new Map<string, CategorizedEvent[]>();
  for (const e of cityEvents) {
    const cats = e.categories.length > 0 ? e.categories : ["Uncategorized"];
    for (const c of cats) {
      const arr = byCategory.get(c) ?? [];
      arr.push(e);
      byCategory.set(c, arr);
    }
  }

  const lines: string[] = [`*${CITY_LABELS[city]}* — ${dateRangeLabel(cityEvents)}`, ""];
  for (const [category, items] of byCategory) {
    lines.push(`*${category}*`);
    for (const item of items) lines.push(formatEventLine(item));
    lines.push("");
  }
  return lines.join("\n").trim();
}

async function postWebhook(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    console.warn(`[slack] webhook -> ${res.status}: ${await res.text()}`);
  }
}

export async function sendDigest(events: CategorizedEvent[]): Promise<void> {
  const total = events.length;
  const byCityCount = CITIES.map((city) => {
    const count = events.filter((e) => e.city === city).length;
    return `${CITY_LABELS[city]}: ${count}`;
  }).join(", ");
  await postWebhook(`Pulled ${total} events (${byCityCount})`);
}

export async function sendHealthAlert(flagged: HealthResult[]): Promise<void> {
  if (flagged.length === 0) return;
  const lines = [":warning: *Scraper health alert*"];
  for (const r of flagged) {
    lines.push(`- \`${r.source}\` / ${r.city}: ${r.status}${r.note ? ` (${r.note})` : ""}`);
  }
  await postWebhook(lines.join("\n"));
}
