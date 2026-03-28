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
    <main className="min-h-screen bg-gray-50 p-8 max-w-lg mx-auto">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        &larr; Home
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-6">My Offers</h1>

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

      {searched && offers.length === 0 && (
        <p className="text-gray-400 text-sm">No active offers found.</p>
      )}

      <div className="space-y-4">
        {offers.map((rsvp) => (
          <OfferCard key={rsvp.id} rsvp={rsvp} onAction={handleAction} />
        ))}
      </div>
    </main>
  );
}
