"use client";

import { useState } from "react";
import Link from "next/link";
import { api, type Rsvp } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-700",
  WAITLISTED: "bg-yellow-100 text-yellow-700",
  OFFERED: "bg-blue-100 text-blue-700",
  EXPIRED: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-red-100 text-red-600",
};

export default function MyTicketsPage() {
  const [userId, setUserId] = useState("");
  const [tickets, setTickets] = useState<Rsvp[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!userId.trim()) return;
    setLoading(true);
    try {
      setTickets(await api<Rsvp[]>(`/rsvp/user/${encodeURIComponent(userId.trim())}`));
      setSearched(true);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  async function cancelRsvp(id: string) {
    try {
      await api(`/rsvp/${id}/cancel`, { method: "POST" });
      search();
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8 max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-blue-600 hover:underline">&larr; Home</Link>
      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-6">My Tickets</h1>

      <div className="flex gap-2 mb-6">
        <input
          placeholder="Your User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={search}
          disabled={loading}
          className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          {loading ? "…" : "Search"}
        </button>
      </div>

      {searched && tickets.length === 0 && (
        <p className="text-gray-400 text-sm">No tickets found.</p>
      )}

      <div className="space-y-3">
        {tickets.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {t.status}
                </span>
                <span className="text-xs text-gray-400">{t.tier}</span>
              </div>
              <p className="text-xs text-gray-400">
                RSVP {t.id.slice(0, 8)}… &middot; Event {t.eventId.slice(0, 8)}…
              </p>
              {t.waitlistPosition && (
                <p className="text-xs text-gray-400">Position: #{t.waitlistPosition}</p>
              )}
            </div>

            {(t.status === "CONFIRMED" || t.status === "OFFERED") && (
              <button
                onClick={() => cancelRsvp(t.id)}
                className="text-xs text-red-500 hover:underline"
              >
                Cancel
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
