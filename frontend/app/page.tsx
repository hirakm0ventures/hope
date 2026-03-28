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
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">hope</h1>
      <p className="text-gray-500 mb-12 text-lg">
        Waitlist &amp; Capacity Engine
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {routes.map(({ href, label, description }) => (
          <Link
            key={href}
            href={href}
            className="block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-1">
              {label}
            </h2>
            <p className="text-gray-500 text-sm">{description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
