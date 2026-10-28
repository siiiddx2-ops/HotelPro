import { Link } from "react-router-dom";
import {
  Hotel, ShieldCheck, CalendarCheck, CreditCard, Bell, BarChart3,
  Users, BedDouble, ArrowRight, Star, Lock, Zap, CheckCircle2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { defaultPath } from "../lib/routes";
import { Logo } from "../components/ui";
import ThemeToggle from "../components/ThemeToggle";

const HERO_IMG = "https://images.pexels.com/photos/14011664/pexels-photo-14011664.jpeg?auto=compress&cs=tinysrgb&h=650&w=940";

const features = [
  { icon: CalendarCheck, title: "Smart Booking Engine", desc: "Real-time availability, instant reservations, and flexible check-in/out management for staff and guests alike." },
  { icon: ShieldCheck, title: "Bank-grade Security", desc: "JWT auth, row-level security, role-based access, and encrypted payments keep every guest interaction protected." },
  { icon: CreditCard, title: "Secure Payments", desc: "Process card, wallet, and bank transfers with automatic invoice generation and refund handling." },
  { icon: BarChart3, title: "Analytics & Reports", desc: "Live occupancy, revenue tracking, and booking analytics with interactive charts for data-driven decisions." },
  { icon: Bell, title: "Notifications", desc: "Guests and staff stay informed with real-time alerts on bookings, payments, and service requests." },
  { icon: BedDouble, title: "Room Inventory", desc: "Manage rooms, categories, seasonal pricing, and housekeeping status from one intuitive dashboard." },
];

const roles = [
  { name: "Guests", points: ["Browse & book rooms instantly", "Online secure payments", "Booking history & cancellations", "Reviews & ratings", "Service requests"], color: "primary" },
  { name: "Hotel Staff", points: ["Check-in / check-out", "Room status updates", "Reservation management", "Housekeeping & service requests", "Guest support"], color: "accent" },
  { name: "Administrators", points: ["Hotel & room inventory", "Staff management & assignment", "Bookings & payment monitoring", "Reports & analytics", "System configuration"], color: "green" },
];

export default function LandingPage() {
  const { profile } = useAuth();
  const ctaTo = profile ? defaultPath(profile.role) : "/signin";

  return (
    <div className="min-h-screen bg-white dark:bg-ink-950">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      <header className="absolute top-0 left-0 right-0 z-30">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/90">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#roles" className="hover:text-white transition">Roles</a>
            <a href="#security" className="hover:text-white transition">Security</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/signin" className="rounded-lg px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition">Sign in</Link>
            <Link to="/signup" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-ink-100 transition">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-[680px] flex items-center overflow-hidden">
        <img src={HERO_IMG} alt="Luxury hotel lobby" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-ink-950/85 via-ink-900/70 to-primary-950/70" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-24">
          <div className="max-w-2xl animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <Zap className="h-3.5 w-3.5 text-accent-400" />
              Modern hotel management, end to end
            </span>
            <h1 className="mt-5 font-display text-4xl sm:text-6xl font-semibold leading-tight text-white">
              Run your hotel with <span className="text-accent-400">confidence</span> and clarity.
            </h1>
            <p className="mt-5 text-lg text-white/80 leading-relaxed max-w-xl">
              HotelPro streamlines bookings, guest management, payments, and operations
              across boutique properties and large chains — secure, scalable, and beautifully simple.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={ctaTo} className="btn-accent text-base">
                {profile ? "Open dashboard" : "Start booking"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className="btn bg-white/10 text-white border border-white/20 hover:bg-white/20">
                Explore features
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-6 text-white/80 text-sm">
              <div className="flex items-center gap-2"><Star className="h-4 w-4 text-accent-400" /> 4.9 guest rating</div>
              <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-accent-400" /> Encrypted payments</div>
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent-400" /> Role-based access</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-ink-100 bg-ink-50 dark:border-ink-800 dark:bg-ink-900">
        <div className="mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4 divide-x divide-ink-200">
          {[
            { label: "Rooms managed", value: "12,000+" },
            { label: "Properties", value: "850+" },
            { label: "Uptime", value: "99.9%" },
            { label: "Bookings / month", value: "240k" },
          ].map((s) => (
            <div key={s.label} className="px-6 py-7 text-center">
              <p className="font-display text-3xl font-semibold text-primary-700">{s.value}</p>
              <p className="mt-1 text-sm text-ink-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 dark:bg-ink-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 dark:text-ink-50">
              Everything a modern hotel needs
            </h2>
            <p className="mt-4 text-ink-500 text-lg dark:text-ink-400">
              From the first booking to checkout, HotelPro brings every workflow together in one secure platform.
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card p-7 hover:shadow-soft transition-all hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-ink-900">{f.title}</h3>
                <p className="mt-2 text-sm text-ink-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="bg-ink-50 py-24 dark:bg-ink-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 dark:text-ink-50">
              Built for every role
            </h2>
            <p className="mt-4 text-ink-500 text-lg dark:text-ink-400">
              Tailored dashboards for guests, staff, and administrators — each with the right tools and access.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {roles.map((r) => (
              <div key={r.name} className="card p-7">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    r.color === "primary" ? "bg-primary-50 text-primary-700" :
                    r.color === "accent" ? "bg-accent-50 text-accent-700" :
                    "bg-green-50 text-green-700"
                  }`}>
                    {r.name === "Guests" ? <Users className="h-5 w-5" /> :
                     r.name === "Hotel Staff" ? <BedDouble className="h-5 w-5" /> :
                     <BarChart3 className="h-5 w-5" />}
                  </div>
                  <h3 className="font-display text-xl font-semibold text-ink-900">{r.name}</h3>
                </div>
                <ul className="mt-5 space-y-3">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-ink-700">
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-24 dark:bg-ink-950">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Security & Compliance
            </span>
            <h2 className="mt-5 font-display text-3xl sm:text-4xl font-semibold text-ink-900 dark:text-ink-50">
              Security at every layer
            </h2>
            <p className="mt-4 text-ink-600 text-lg leading-relaxed dark:text-ink-300">
              HotelPro is built on Supabase with Postgres row-level security, JWT authentication,
              and role-based access control — so data never leaks between guests, staff, or properties.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {[
                { icon: Lock, t: "Password hashing", d: "bcrypt-hashed credentials" },
                { icon: Users, t: "Role-based access", d: "Guest, staff, admin scopes" },
                { icon: ShieldCheck, t: "Row-level security", d: "Per-row access policies" },
                { icon: CreditCard, t: "Secure payments", d: "Encrypted transaction flow" },
              ].map((x) => (
                <div key={x.t} className="flex gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-100 text-ink-700 shrink-0">
                    <x.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink-900 text-sm">{x.t}</p>
                    <p className="text-sm text-ink-500">{x.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="card overflow-hidden p-0">
              <img
                src="https://images.pexels.com/photos/6758531/pexels-photo-6758531.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
                alt="Hotel lobby"
                className="h-80 w-full object-cover"
              />
              <div className="absolute bottom-6 left-6 right-6 rounded-xl bg-white/95 backdrop-blur p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-ink-500">Live occupancy</p>
                    <p className="font-display text-2xl font-semibold text-ink-900">87%</p>
                  </div>
                  <div className="flex items-end gap-1">
                    {[40, 65, 50, 80, 72, 90, 87].map((h, i) => (
                      <div key={i} className="w-3 rounded-t bg-primary-500" style={{ height: `${h * 0.5}px` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-700 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white">
            Ready to modernize your hotel operations?
          </h2>
          <p className="mt-4 text-primary-100 text-lg">
            Join hundreds of properties running smoother on HotelPro. Create your account in seconds.
          </p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <Link to="/signup" className="btn-accent text-base">
              Create your account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/signin" className="btn bg-white/10 text-white border border-white/30 hover:bg-white/20">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-ink-950 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo className="[&_span]:text-white" />
          <p className="text-sm text-ink-400">
            Built with Supabase, React, and Tailwind. A modern hotel management platform.
          </p>
          <div className="flex gap-5 text-sm text-ink-400">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#security" className="hover:text-white">Security</a>
            <Link to="/signin" className="hover:text-white">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
