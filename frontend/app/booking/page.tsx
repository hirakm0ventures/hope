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
    <main className="page-shell">
      <div className="page-container space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="btn-ghost w-fit">
            &larr; Back home
          </Link>
          <span className="section-label">
            Booking Flow
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr,1.05fr]">
          {/* Event list */}
          {!selectedEvent && (
            <div className="page-card space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-white">
                    Book a seat
                  </h1>
                  <p className="page-subtitle">
                    Pick an event to view live capacity and tiers.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/20 text-emerald-100 text-xs px-3 py-1 border border-emerald-400/30">
                  Real-time
                </span>
              </div>

              <div className="grid gap-3">
                {events.length === 0 && (
                  <p className="text-slate-400 text-sm">No events found.</p>
                )}
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
            <div className="page-card space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="section-label">Selected event</p>
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-white">
                    {selectedEvent.name}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setSelectedEvent(null);
                    setMsg(null);
                  }}
                  className="btn-ghost w-fit"
                >
                  Switch event
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                <Stat label="Total Capacity" value={selectedEvent.totalCapacity} />
                <Stat label="Confirmed" value={selectedEvent.confirmed} />
                <Stat label="Available" value={selectedEvent.available} />
                <Stat label="Waitlisted" value={selectedEvent.waitlisted} />
              </div>

              {/* Book form */}
              <div className="surface-row space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
    <div className="stat-tile">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
