"use client";

import { useState } from "react";
import Link from "next/link";
import { api, type Rsvp } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "border border-emerald-300/40 bg-emerald-500/15 text-emerald-100",
  WAITLISTED: "border border-amber-300/40 bg-amber-500/15 text-amber-100",
  OFFERED: "border border-cyan-300/40 bg-cyan-500/15 text-cyan-100",
  EXPIRED: "border border-slate-300/30 bg-slate-500/20 text-slate-200",
  CANCELLED: "border border-rose-300/40 bg-rose-500/15 text-rose-100",
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
      setTickets(
        await api<Rsvp[]>(`/rsvp/user/${encodeURIComponent(userId.trim())}`),
      );
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
    <main className="page-shell">
      <div className="page-container space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="btn-ghost w-fit">
            &larr; Back home
          </Link>
          <span className="section-label">
            My Tickets
          </span>
        </div>

        <div className="page-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-white">
                Manage your tickets
              </h1>
              <p className="page-subtitle">
                Lookup by user ID to view confirmed, offered, or waitlisted spots.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row">
              <input
                placeholder="Your User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                className="input-style"
              />
              <button
                onClick={search}
                disabled={loading}
                className="btn-primary whitespace-nowrap"
              >
                {loading ? "…" : "Search"}
              </button>
            </div>
          </div>

          {searched && tickets.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              No tickets found for this user.
            </p>
          )}

          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[t.status] ?? "border border-white/20 bg-white/10 text-white"}`}
                    >
                      {t.status}
                    </span>
                    <span className="text-xs text-slate-300">{t.tier}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    RSVP {t.id.slice(0, 8)}… · Event {t.eventId.slice(0, 8)}…
                  </p>
                  {t.waitlistPosition && (
                    <p className="text-xs text-slate-400">Position: #{t.waitlistPosition}</p>
                  )}
                </div>

                {(t.status === "CONFIRMED" || t.status === "OFFERED") && (
                  <button
                    onClick={() => cancelRsvp(t.id)}
                    className="text-xs text-rose-200 underline-offset-4 hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
