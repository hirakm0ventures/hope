import Link from "next/link";

const routes = [
  {
    href: "/booking",
    label: "Booking",
    description: "Browse and book available event slots",
  },
  {
    href: "/waitlist",
    label: "Waitlist",
    description: "Join the waitlist for fully-booked events",
  },
  {
    href: "/offers",
    label: "Offers",
    description: "View released waitlist offers",
  },
  {
    href: "/my-tickets",
    label: "My Tickets",
    description: "Manage your confirmed tickets",
  },
  {
    href: "/host",
    label: "Host Dashboard",
    description: "Manage event capacity and view stats",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen text-slate-100">
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg shadow-emerald-500/30" />
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
                Waitlist Engine
              </p>
              <h1 className="text-3xl font-semibold text-white">hope</h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-sm text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live capacity sync
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr,0.9fr]">
          <div className="glass-panel rounded-3xl p-8 lg:p-10 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-cyan-200/90 border border-white/10">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              Real-time waitlist orchestration
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl sm:text-5xl font-semibold leading-tight text-white">
                Ship product-grade ticketing in minutes.
              </h2>
              <p className="text-slate-300 text-base sm:text-lg">
                Manage bookings, waitlists, and just-in-time offers without touching the backend code you already trust.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/booking" className="btn-primary">
                Start booking
              </Link>
              <Link href="/host" className="btn-ghost">
                Host dashboard
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {[
                { label: "99.95%", sub: "API uptime" },
                { label: "<120ms", sub: "Offer dispatch" },
                { label: "Granular", sub: "Tiered controls" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                  <p className="text-lg font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6 sm:p-7">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400 mb-4">
              Navigate
            </p>
            <div className="grid grid-cols-1 gap-4">
              {routes.map(({ href, label, description }) => (
                <Link
                  key={href}
                  href={href}
                  className="group relative rounded-2xl border border-white/5 bg-white/5 p-4 transition hover:border-cyan-300/60 hover:bg-white/8"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{label}</h3>
                      <p className="text-sm text-slate-300">{description}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 group-hover:border-cyan-300/60">
                      Open
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
