"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Event, type Rsvp } from "@/lib/api";

export default function WaitlistPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState("");
  const [userId, setUserId] = useState("");
  const [tier, setTier] = useState("GENERAL");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    api<Event[]>("/events").then((evts) => {
      setEvents(evts);
      if (evts.length > 0) setEventId(evts[0].id);
    });
  }, []);

  async function handleJoin() {
    if (!userId.trim() || !eventId) return;
    setLoading(true);
    setMsg(null);
    try {
      const rsvp = await api<Rsvp>("/waitlist/join", {
        method: "POST",
        body: JSON.stringify({ userId: userId.trim(), eventId, tier }),
      });
      setMsg({
        type: "ok",
        text: `Joined waitlist at position ${rsvp.waitlistPosition} (ID: ${rsvp.id})`,
      });
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8 max-w-lg mx-auto">
      <Link href="/" className="text-sm text-blue-600 hover:underline">&larr; Home</Link>
      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-6">Join Waitlist</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <label className="block">
          <span className="text-sm text-gray-600">Event</span>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">User ID</span>
          <input
            placeholder="e.g. user-123"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Tier Preference</span>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="GENERAL">General</option>
            <option value="VIP">VIP</option>
            <option value="EARLY_BIRD">Early Bird</option>
          </select>
        </label>

        <button
          disabled={loading || !userId.trim()}
          onClick={handleJoin}
          className="w-full rounded-lg bg-gray-900 text-white py-2 text-sm font-medium disabled:opacity-40 hover:bg-gray-800 transition-colors"
        >
          {loading ? "Joining…" : "Join Waitlist"}
        </button>

        {msg && (
          <p className={`text-sm ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </main>
  );
}
