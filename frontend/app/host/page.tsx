"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Event, type EventStats } from "@/lib/api";

export default function HostPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  useEffect(() => {
    api<Event[]>("/events").then(setEvents);
  }, []);

  async function selectEvent(id: string) {
    const stats = await api<EventStats>(`/events/${id}/stats`);
    setSelected(stats);
    setMsg(null);
  }

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
    <main className="min-h-screen text-slate-100">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="btn-ghost">
            &larr; Back home
          </Link>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Host Dashboard
          </span>
        </div>

        {!selected && (
          <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-white">Manage events</h1>
                <p className="text-slate-300 text-sm">Choose an event to view stats and adjust capacity.</p>
              </div>
              <span className="rounded-full bg-sky-500/15 text-sky-100 border border-sky-400/40 text-xs px-3 py-1">
                Host view
              </span>
            </div>
            <div className="grid gap-3">
              {events.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => selectEvent(ev.id)}
                  className="group w-full text-left rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-300/60 hover:bg-white/8"
                >
                  <div className="flex items-center justify-between">
                    <div>
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
          <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Active event</p>
                <h2 className="text-2xl font-semibold text-white">{selected.name}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost">
                Switch event
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <Stat label="Total Capacity" value={selected.totalCapacity} />
              <Stat label="Confirmed" value={selected.confirmed} />
              <Stat label="Available" value={selected.available} />
              <Stat label="Waitlisted" value={selected.waitlisted} />
              <Stat label="Active Offers" value={selected.offered} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
              <div className="flex items-center justify-between">
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
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
