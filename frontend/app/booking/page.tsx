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
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    api<Event[]>("/events").then(setEvents).catch(() => {});
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
        body: JSON.stringify({ userId: userId.trim(), eventId: selectedEvent.id, tier }),
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
    <main className="min-h-screen bg-gray-50 p-8 max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-blue-600 hover:underline">&larr; Home</Link>
      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-6">Booking</h1>

      {/* Event list */}
      {!selectedEvent && (
        <div className="space-y-3">
          <p className="text-gray-500 text-sm mb-2">Select an event:</p>
          {events.length === 0 && <p className="text-gray-400">No events found.</p>}
          {events.map((ev) => (
            <button
              key={ev.id}
              onClick={() => selectEvent(ev.id)}
              className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 hover:shadow transition-shadow"
            >
              <p className="font-semibold text-gray-800">{ev.name}</p>
              <p className="text-xs text-gray-400">Capacity: {ev.totalCapacity}</p>
            </button>
          ))}
        </div>
      )}

      {/* Selected event detail */}
      {selectedEvent && (
        <div className="space-y-4">
          <button onClick={() => setSelectedEvent(null)} className="text-sm text-blue-600 hover:underline">
            &larr; Back to events
          </button>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">{selectedEvent.name}</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Total Capacity" value={selectedEvent.totalCapacity} />
              <Stat label="Confirmed" value={selectedEvent.confirmed} />
              <Stat label="Available" value={selectedEvent.available} />
              <Stat label="Waitlisted" value={selectedEvent.waitlisted} />
            </div>
          </div>

          {/* Book form */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
            <h3 className="font-semibold text-gray-800">
              {selectedEvent.available > 0 ? "Book a Ticket" : "Join Waitlist"}
            </h3>

            <input
              placeholder="Your User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />

            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="GENERAL">General</option>
              <option value="VIP">VIP</option>
              <option value="EARLY_BIRD">Early Bird</option>
            </select>

            <button
              disabled={loading || !userId.trim()}
              onClick={handleBook}
              className="w-full rounded-lg bg-gray-900 text-white py-2 text-sm font-medium disabled:opacity-40 hover:bg-gray-800 transition-colors"
            >
              {loading
                ? "Processing…"
                : selectedEvent.available > 0
                  ? "Book Ticket"
                  : "Join Waitlist"}
            </button>

            {msg && (
              <p className={`text-sm ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                {msg.text}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-lg font-semibold text-gray-800">{value}</p>
    </div>
  );
}
