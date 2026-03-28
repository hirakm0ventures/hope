"use client";

import { useState } from "react";
import Link from "next/link";
import { api, type Rsvp } from "@/lib/api";
import OfferCard from "./offer-card";

export default function OffersPage() {
  const [userId, setUserId] = useState("");
  const [offers, setOffers] = useState<Rsvp[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!userId.trim()) return;
    setLoading(true);
    try {
      const all = await api<Rsvp[]>(
        `/rsvp/user/${encodeURIComponent(userId.trim())}`,
      );
      setOffers(all.filter((r) => r.status === "OFFERED"));
      setSearched(true);
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }

  function handleAction() {
    // refresh after accept/decline
    search();
  }

  return (
    <main className="page-shell">
      <div className="page-container space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="btn-ghost w-fit">
            &larr; Back home
          </Link>
          <span className="section-label">
            Offers
          </span>
        </div>

        <div className="page-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-white">
                Your active offers
              </h1>
              <p className="page-subtitle">
                Search by user ID to review and act before they expire.
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

          {searched && offers.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              No active offers found for this user.
            </p>
          )}

          <div className="space-y-4">
            {offers.map((rsvp) => (
              <OfferCard key={rsvp.id} rsvp={rsvp} onAction={handleAction} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
