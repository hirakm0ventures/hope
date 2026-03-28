"use client";

import { useEffect, useState } from "react";
import { api, type Rsvp } from "@/lib/api";

export default function OfferCard({
  rsvp,
  onAction,
}: {
  rsvp: Rsvp;
  onAction: () => void;
}) {
  const [remaining, setRemaining] = useState<number>(
    calcRemaining(rsvp.offerExpiresAt),
  );
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(calcRemaining(rsvp.offerExpiresAt));
    }, 1000);
    return () => clearInterval(id);
  }, [rsvp.offerExpiresAt]);

  const expired = remaining <= 0;

  async function accept() {
    setActing(true);
    setMsg(null);
    try {
      await api(`/offers/${rsvp.id}/accept`, { method: "POST" });
      setMsg({ type: "ok", text: "Ticket confirmed!" });
      onAction();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setActing(false);
    }
  }

  async function decline() {
    setActing(true);
    setMsg(null);
    try {
      await api(`/offers/${rsvp.id}/decline`, { method: "POST" });
      setMsg({ type: "ok", text: "Offer declined." });
      onAction();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-gray-800">Offer</p>
          <p className="text-xs text-gray-400">
            RSVP {rsvp.id.slice(0, 8)}… &middot; {rsvp.tier}
          </p>
        </div>
        <span
          className={`text-sm font-mono tabular-nums ${expired ? "text-red-500" : "text-green-600"}`}
        >
          {expired ? "EXPIRED" : formatTime(remaining)}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          disabled={acting || expired}
          onClick={accept}
          className="flex-1 rounded-lg bg-green-600 text-white py-2 text-sm font-medium disabled:opacity-40 hover:bg-green-700 transition-colors"
        >
          Accept
        </button>
        <button
          disabled={acting}
          onClick={decline}
          className="flex-1 rounded-lg bg-red-600 text-white py-2 text-sm font-medium disabled:opacity-40 hover:bg-red-700 transition-colors"
        >
          Decline
        </button>
      </div>

      {msg && (
        <p
          className={`text-sm ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}

function calcRemaining(expiresAt: string | null): number {
  if (!expiresAt) return 0;
  return Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
