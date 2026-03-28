const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function api<T = unknown>(
  path: string,
  opts?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...opts?.headers },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* ── Types ─────────────────────────────────── */

export interface Event {
  id: string;
  name: string;
  totalCapacity: number;
  createdAt: string;
}

export interface EventStats extends Event {
  confirmed: number;
  waitlisted: number;
  offered: number;
  available: number;
}

export interface EventQueueItem {
  id: string;
  userId: string;
  tier: Tier;
  status: "WAITLISTED" | "OFFERED";
  waitlistPosition: number | null;
  offerExpiresAt: string | null;
  createdAt: string;
}

export type Tier = "GENERAL" | "VIP" | "EARLY_BIRD" | "ANY";
export type RsvpStatus =
  | "CONFIRMED"
  | "WAITLISTED"
  | "OFFERED"
  | "EXPIRED"
  | "CANCELLED";

export interface Rsvp {
  id: string;
  userId: string;
  eventId: string;
  tier: Tier;
  status: RsvpStatus;
  waitlistPosition: number | null;
  offerExpiresAt: string | null;
  createdAt: string;
}
