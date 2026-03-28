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
    <main className="page-shell">
      <div className="page-container space-y-8 sm:space-y-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-[1.15rem] bg-gradient-to-br from-emerald-400 via-cyan-400 to-sky-500 shadow-lg shadow-cyan-500/30" />
            <div>
              <p className="section-label">Waitlist Engine</p>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white">
                hope
              </h1>
            </div>
          </div>
          <div className="inline-flex items-center gap-3 self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 shadow-lg shadow-black/10 sm:self-auto">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Live capacity sync
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="page-card space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-cyan-200/90 border border-white/10">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              Real-time waitlist orchestration
            </div>
            <div className="space-y-3">
              <h2 className="page-heading max-w-2xl leading-[1.02]">
                Ship product-grade ticketing in minutes.
              </h2>
              <p className="page-subtitle max-w-2xl">
                Manage bookings, waitlists, and just-in-time offers without touching the backend code you already trust.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/booking" className="btn-primary w-full sm:w-auto">
                Start booking
              </Link>
              <Link href="/host" className="btn-ghost w-full sm:w-auto">
                Host dashboard
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
              {[
                { label: "99.95%", sub: "API uptime" },
                { label: "<120ms", sub: "Offer dispatch" },
                { label: "Granular", sub: "Tiered controls" },
              ].map((item) => (
                <div key={item.label} className="stat-tile">
                  <p className="text-lg font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="page-card">
            <p className="section-label mb-4">
              Navigate
            </p>
            <div className="grid grid-cols-1 gap-4">
              {routes.map(({ href, label, description }) => (
                <Link
                  key={href}
                  href={href}
                  className="group relative rounded-2xl border border-white/5 bg-white/5 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/60 hover:bg-white/8"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-white">
                        {label}
                      </h3>
                      <p className="text-sm text-slate-300 leading-6">
                        {description}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200 group-hover:border-cyan-300/60">
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
