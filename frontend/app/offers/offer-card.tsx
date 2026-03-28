"use client";

import { useEffect, useRef, useState } from "react";
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
  const hasRefreshedAfterExpiry = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(calcRemaining(rsvp.offerExpiresAt));
    }, 1000);
    return () => clearInterval(id);
  }, [rsvp.offerExpiresAt]);

  useEffect(() => {
    hasRefreshedAfterExpiry.current = false;
  }, [rsvp.id, rsvp.offerExpiresAt]);

  const expired = remaining <= 0;

  useEffect(() => {
    if (!expired || hasRefreshedAfterExpiry.current) return;
    hasRefreshedAfterExpiry.current = true;
    onAction();
  }, [expired, onAction]);

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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 shadow-lg shadow-cyan-500/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-semibold text-white">Offer</p>
          <p className="text-xs text-slate-400">
            RSVP {rsvp.id.slice(0, 8)}… · {rsvp.tier}
          </p>
        </div>
        <span
          className={`text-sm font-mono tabular-nums rounded-full px-3 py-1 border ${expired ? "border-rose-300/40 text-rose-100 bg-rose-500/10" : "border-emerald-300/40 text-emerald-50 bg-emerald-500/10"}`}
        >
          {expired ? "EXPIRED" : formatTime(remaining)}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          disabled={acting || expired}
          onClick={accept}
          className="flex-1 btn-primary"
        >
          Accept
        </button>
        <button
          disabled={acting}
          onClick={decline}
          className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:border-rose-300/60"
        >
          Decline
        </button>
      </div>

      {msg && (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${msg.type === "ok" ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-50" : "border-rose-300/40 bg-rose-500/10 text-rose-50"}`}
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
