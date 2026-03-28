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
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

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
    <main className="page-shell">
      <div className="page-container space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="btn-ghost w-fit">
            &larr; Back home
          </Link>
          <span className="section-label">
            Waitlist
          </span>
        </div>

        <div className="page-card space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-white">
                Join the waitlist
              </h1>
              <p className="page-subtitle">
                Reserve your place; you will auto-notify when a seat opens.
              </p>
            </div>
            <span className="rounded-full bg-amber-500/15 text-amber-100 border border-amber-400/40 text-xs px-3 py-1">
              Fair queueing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Event</span>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="input-style"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">User ID</span>
              <input
                placeholder="e.g. user-123"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="input-style"
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-sm text-slate-300">Tier preference</span>
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
          </label>

          <button
            disabled={loading || !userId.trim()}
            onClick={handleJoin}
            className="w-full btn-primary"
          >
            {loading ? "Joining…" : "Join Waitlist"}
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
    </main>
  );
}
