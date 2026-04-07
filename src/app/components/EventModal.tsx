"use client";
import { useEffect } from "react";
import type { Event, Guest } from "../../../db/schema";

const SOURCE_COLORS: Record<string, string> = {
  luma: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  eventbrite: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  meetup: "bg-red-500/20 text-red-300 border-red-500/30",
};

function formatFullDate(dateStr: string, time: string | null, endTime: string | null): string {
  const d = new Date(`${dateStr}T${time ?? "00:00:00"}`);
  const dayStr = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  if (!time) return dayStr;
  const t = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (!endTime) return `${dayStr} · ${t}`;
  const endD = new Date(`${dateStr}T${endTime}`);
  const et = endD.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${dayStr} · ${t} – ${et}`;
}

function GuestCard({ guest }: { guest: Guest }) {
  const profileUrl = guest.linkedinHandle
    ? `https://linkedin.com${guest.linkedinHandle.startsWith("/") ? guest.linkedinHandle : `/in/${guest.linkedinHandle}`}`
    : guest.twitterHandle
      ? `https://x.com/${guest.twitterHandle}`
      : null;

  const inner = (
    <div className="flex items-center gap-2.5">
      {guest.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={guest.avatarUrl}
          alt=""
          className="h-8 w-8 rounded-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-xs text-neutral-400">
          {guest.name.charAt(0)}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-sm text-neutral-200">{guest.name}</div>
        {guest.bio && (
          <div className="truncate text-[11px] text-neutral-500">{guest.bio}</div>
        )}
      </div>
      {(guest.linkedinHandle || guest.twitterHandle) && (
        <div className="ml-auto flex shrink-0 gap-1.5 text-neutral-500">
          {guest.linkedinHandle && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          )}
          {guest.twitterHandle && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          )}
        </div>
      )}
    </div>
  );

  if (profileUrl) {
    return (
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg p-2 transition hover:bg-neutral-800/50"
      >
        {inner}
      </a>
    );
  }
  return <div className="rounded-lg p-2">{inner}</div>;
}

export function EventModal({ event, onClose }: { event: Event; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const guests = (event.guests ?? []) as Guest[];
  const guestCount = event.guestCount ?? 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt=""
            className="h-48 w-full rounded-t-xl object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        <div className="p-6">
          <div className="mb-3 flex items-start gap-3">
            <h2 className="flex-1 text-xl font-semibold leading-tight text-neutral-100">{event.title}</h2>
            <span
              className={`whitespace-nowrap rounded border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                SOURCE_COLORS[event.source] ?? "bg-neutral-800 text-neutral-400 border-neutral-700"
              }`}
            >
              {event.source}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2 text-neutral-300">
              <span className="mt-0.5 text-neutral-500">When</span>
              <span>{formatFullDate(event.date, event.time, event.endTime)}</span>
            </div>
            {event.venue && (
              <div className="flex items-start gap-2 text-neutral-300">
                <span className="mt-0.5 text-neutral-500">Where</span>
                <span>{event.venue}</span>
              </div>
            )}
            {event.organizer && (
              <div className="flex items-start gap-2 text-neutral-300">
                <span className="mt-0.5 text-neutral-500">Host</span>
                <span>{event.organizer}</span>
              </div>
            )}
          </div>

          {event.categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {event.categories.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-neutral-800 bg-neutral-900 px-2.5 py-0.5 text-xs text-neutral-300"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {event.description && (
            <div className="mt-5 border-t border-neutral-800 pt-4">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">About</h3>
              <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
                {event.description}
              </p>
            </div>
          )}

          <div className="mt-5 border-t border-neutral-800 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Attendees{guestCount > 0 && ` (${guestCount})`}
              </h3>
            </div>
            {guests.length > 0 ? (
              <div className="max-h-64 space-y-0.5 overflow-y-auto">
                {guests.map((g, i) => (
                  <GuestCard key={i} guest={g} />
                ))}
                {guestCount > guests.length && (
                  <p className="pt-2 text-center text-xs text-neutral-500">
                    +{guestCount - guests.length} more attending
                  </p>
                )}
              </div>
            ) : event.source === "luma" ? (
              <p className="text-xs italic text-neutral-500">
                No guest data yet — run <code className="rounded bg-neutral-800 px-1 py-0.5">npm run scrape:guests</code>
              </p>
            ) : (
              <p className="text-xs italic text-neutral-500">
                Guest lists only available for Luma events
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <a
              href={event.url.startsWith("http") ? event.url : `https://lu.ma/${event.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-white"
            >
              View on {event.source}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M7 7h10v10" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
