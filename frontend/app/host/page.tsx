"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  type Event,
  type EventQueueItem,
  type EventStats,
} from "@/lib/api";

export default function HostPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState<EventStats | null>(null);
  const [queue, setQueue] = useState<EventQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  useEffect(() => {
    api<Event[]>("/events").then(setEvents);
  }, []);

  async function selectEvent(id: string) {
    const [stats, queueItems] = await Promise.all([
      api<EventStats>(`/events/${id}/stats`),
      api<EventQueueItem[]>(`/events/${id}/queue`),
    ]);
    setSelected(stats);
    setQueue(queueItems);
  }

  useEffect(() => {
    if (!selected) return;

    const id = window.setInterval(() => {
      void selectEvent(selected.id);
    }, 10_000);

    return () => window.clearInterval(id);
  }, [selected?.id]);

  async function increaseCapacity() {
    if (!selected) return;
    setLoading(true);
    setMsg(null);
    try {
      await api(`/events/${selected.id}/capacity`, {
        method: "PATCH",
        body: JSON.stringify({ totalCapacity: selected.totalCapacity + 10 }),
      });
      setMsg({
        type: "ok",
        text: "Capacity increased by 10. Waitlist processed.",
      });
      await selectEvent(selected.id);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="page-container space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="btn-ghost w-fit">
            &larr; Back home
          </Link>
          <span className="section-label">
            Host Dashboard
          </span>
        </div>

        {!selected && (
          <div className="page-card space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-white">
                  Manage events
                </h1>
                <p className="page-subtitle">
                  Choose an event to view stats and adjust capacity.
                </p>
              </div>
              <span className="rounded-full bg-sky-500/15 text-sky-100 border border-sky-400/40 text-xs px-3 py-1">
                Host view
              </span>
            </div>
            <div className="grid gap-3">
              {events.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => {
                    setMsg(null);
                    void selectEvent(ev.id);
                  }}
                  className="group w-full text-left rounded-2xl border border-white/10 bg-white/5 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/60 hover:bg-white/8"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-white">{ev.name}</p>
                      <p className="text-xs text-slate-400">Capacity: {ev.totalCapacity}</p>
                    </div>
                    <span className="text-[11px] rounded-full bg-white/5 px-3 py-1 text-slate-300 border border-white/10 group-hover:border-cyan-300/60">
                      Open
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selected && (
          <div className="page-card space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="section-label">Active event</p>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-white">
                  {selected.name}
                </h2>
              </div>
              <button
                onClick={() => {
                  setSelected(null);
                  setQueue([]);
                }}
                className="btn-ghost w-fit"
              >
                Switch event
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-5">
              <Stat label="Total Capacity" value={selected.totalCapacity} />
              <Stat label="Confirmed" value={selected.confirmed} />
              <Stat label="Available" value={selected.available} />
              <Stat label="Waitlisted" value={selected.waitlisted} />
              <Stat label="Active Offers" value={selected.offered} />
            </div>

            <div className="surface-row space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-300">Adjust capacity by +10 to unlock waitlisted seats.</p>
                <span className="text-xs text-slate-400">Auto-process waitlist</span>
              </div>
              <button
                disabled={loading}
                onClick={increaseCapacity}
                className="w-full btn-primary"
              >
                {loading ? "Updating…" : "Increase Capacity (+10)"}
              </button>
              {msg && (
                <p
                  className={`rounded-xl border px-4 py-3 text-sm ${msg.type === "ok" ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-50" : "border-rose-300/40 bg-rose-500/10 text-rose-50"}`}
                >
                  {msg.text}
                </p>
              )}
            </div>

            <div className="surface-row space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-white">Waitlist & offer state</p>
                  <p className="text-sm text-slate-300">
                    Live queue ordered by active offers first, then FIFO waitlist.
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  Auto-refresh every 10s
                </span>
              </div>

              {queue.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  No active waitlist or offer state for this event.
                </p>
              ) : (
                <div className="space-y-3">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.status === "OFFERED" ? "border border-cyan-300/40 bg-cyan-500/15 text-cyan-100" : "border border-amber-300/40 bg-amber-500/15 text-amber-100"}`}
                            >
                              {item.status}
                            </span>
                            <span className="text-xs text-slate-200">
                              {item.userId}
                            </span>
                            <span className="text-xs text-slate-400">
                              {item.tier}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            RSVP {item.id.slice(0, 8)}…
                          </p>
                        </div>

                        <div className="text-xs text-slate-300 sm:text-right">
                          {item.status === "WAITLISTED" ? (
                            <p>Position #{item.waitlistPosition}</p>
                          ) : (
                            <p>
                              Expires {formatOfferTime(item.offerExpiresAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-tile">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function formatOfferTime(expiresAt: string | null) {
  if (!expiresAt) return "soon";

  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return "now";

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `in ${minutes}:${String(seconds).padStart(2, "0")}`;
}
