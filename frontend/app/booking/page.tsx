"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Event, type EventStats, type Rsvp } from "@/lib/api";

export default function BookingPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventStats | null>(null);
  const [userId, setUserId] = useState("");
  const [tier, setTier] = useState<string>("GENERAL");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  useEffect(() => {
    api<Event[]>("/events")
      .then(setEvents)
      .catch(() => {});
  }, []);

  async function selectEvent(id: string) {
    const stats = await api<EventStats>(`/events/${id}/stats`);
    setSelectedEvent(stats);
    setMsg(null);
  }

  async function handleBook() {
    if (!selectedEvent || !userId.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const rsvp = await api<Rsvp>("/rsvp", {
        method: "POST",
        body: JSON.stringify({
          userId: userId.trim(),
          eventId: selectedEvent.id,
          tier,
        }),
      });
      setMsg({
        type: "ok",
        text:
          rsvp.status === "CONFIRMED"
            ? `Ticket confirmed! RSVP ID: ${rsvp.id}`
            : `Event full — you've been waitlisted at position ${rsvp.waitlistPosition}`,
      });
      await selectEvent(selectedEvent.id);
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
            Booking Flow
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,1.05fr] gap-6">
          {/* Event list */}
          {!selectedEvent && (
            <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-white">Book a seat</h1>
                  <p className="text-slate-300 text-sm">
                    Pick an event to view live capacity and tiers.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/20 text-emerald-100 text-xs px-3 py-1 border border-emerald-400/30">
                  Real-time
                </span>
              </div>

              <div className="space-y-3">
                {events.length === 0 && (
                  <p className="text-slate-400 text-sm">No events found.</p>
                )}
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
                        View
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected event detail */}
          {selectedEvent && (
            <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">Selected event</p>
                  <h2 className="text-2xl font-semibold text-white">
                    {selectedEvent.name}
                  </h2>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="btn-ghost">
                  Switch event
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Stat label="Total Capacity" value={selectedEvent.totalCapacity} />
                <Stat label="Confirmed" value={selectedEvent.confirmed} />
                <Stat label="Available" value={selectedEvent.available} />
                <Stat label="Waitlisted" value={selectedEvent.waitlisted} />
              </div>

              {/* Book form */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">
                    {selectedEvent.available > 0 ? "Book a Ticket" : "Join Waitlist"}
                  </h3>
                  <span className={`text-xs rounded-full px-3 py-1 border ${selectedEvent.available > 0 ? "border-emerald-300/40 text-emerald-100 bg-emerald-500/10" : "border-amber-200/40 text-amber-100 bg-amber-500/10"}`}>
                    {selectedEvent.available > 0 ? "Spots open" : "Waitlist"}
                  </span>
                </div>

                <input
                  placeholder="Your User ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="input-style"
                />

                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className="input-style"
                >
                  <option value="GENERAL">General</option>
                  <option value="VIP">VIP</option>
                  <option value="EARLY_BIRD">Early Bird</option>
                  <option value="ANY">Any tier</option>
                </select>

                <button
                  disabled={loading || !userId.trim()}
                  onClick={handleBook}
                  className="w-full btn-primary"
                >
                  {loading
                    ? "Processing…"
                    : selectedEvent.available > 0
                      ? "Book Ticket"
                      : "Join Waitlist"}
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
