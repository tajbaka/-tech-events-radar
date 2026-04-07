export function formatEventDate(dateStr: string, timeStr: string | null): string {
  const d = new Date(`${dateStr}T${timeStr ?? "00:00:00"}`);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };
  const datePart = d.toLocaleDateString("en-US", opts);
  if (!timeStr) return datePart;
  const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

export function sourceBadgeColor(source: string): string {
  switch (source) {
    case "luma":
      return "bg-purple-500/20 text-purple-300 border-purple-500/40";
    case "eventbrite":
      return "bg-orange-500/20 text-orange-300 border-orange-500/40";
    case "meetup":
      return "bg-red-500/20 text-red-300 border-red-500/40";
    case "posh":
      return "bg-pink-500/20 text-pink-300 border-pink-500/40";
    default:
      return "bg-zinc-500/20 text-zinc-300 border-zinc-500/40";
  }
}
