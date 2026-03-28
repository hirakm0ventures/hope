"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Event, type EventStats } from "@/lib/api";

export default function HostPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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
      setMsg({ type: "ok", text: "Capacity increased by 10. Waitlist processed." });
      await selectEvent(selected.id);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8 max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-blue-600 hover:underline">&larr; Home</Link>
      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-6">Host Dashboard</h1>

      {!selected && (
        <div className="space-y-3">
          <p className="text-gray-500 text-sm">Select an event to manage:</p>
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

      {selected && (
        <div className="space-y-4">
          <button onClick={() => setSelected(null)} className="text-sm text-blue-600 hover:underline">
            &larr; Back to events
          </button>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{selected.name}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Stat label="Total Capacity" value={selected.totalCapacity} />
              <Stat label="Confirmed" value={selected.confirmed} />
              <Stat label="Available" value={selected.available} />
              <Stat label="Waitlisted" value={selected.waitlisted} />
              <Stat label="Active Offers" value={selected.offered} />
            </div>
          </div>

          <button
            disabled={loading}
            onClick={increaseCapacity}
            className="w-full rounded-lg bg-gray-900 text-white py-2.5 text-sm font-medium disabled:opacity-40 hover:bg-gray-800 transition-colors"
          >
            {loading ? "Updating…" : "Increase Capacity (+10)"}
          </button>

          {msg && (
            <p className={`text-sm ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
              {msg.text}
            </p>
          )}
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-2xl font-semibold text-gray-800">{value}</p>
    </div>
  );
}
