import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { Logo, Spinner } from "../components/ui";
import { defaultPath } from "../lib/routes";
import { Mail, Lock, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

export default function SignInPage() {
  const { signIn, profile } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      push(error, "error");
      return;
    }
    push("Welcome back!", "success");
    const dest = (loc.state as { from?: string })?.from;
    navigate(dest ?? defaultPath(profile?.role));
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your hotel experience.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@hotel.com"
              className="input pl-9"
            />
          </div>
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input pl-9"
            />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Spinner className="h-4 w-4" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
        Don't have an account?{" "}
        <Link to="/signup" className="font-semibold text-primary-700 hover:underline dark:text-primary-400">Create one</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ink-50 dark:bg-ink-950">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      {/* Brand panel */}
      <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-primary-900 p-12">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/14011664/pexels-photo-14011664.jpeg?auto=compress&cs=tinysrgb&h=900&w=900"
            alt="Hotel lobby"
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-950/90 via-primary-900/80 to-ink-950/90" />
        </div>
        <div className="relative">
          <Logo className="[&_span]:text-white" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent-400" />
            Trusted by 850+ properties
          </div>
          <h2 className="mt-5 font-display text-4xl font-semibold text-white leading-tight">
            The complete hotel management platform.
          </h2>
          <p className="mt-4 text-white/80 max-w-md leading-relaxed">
            Secure bookings, real-time operations, and powerful analytics — for guests, staff, and administrators.
          </p>
          <ul className="mt-8 space-y-3">
            {["Real-time room availability", "Secure payment processing", "Role-based dashboards"].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-white/90 text-sm">
                <ShieldCheck className="h-4 w-4 text-accent-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-white/60 text-sm">© 2026 HotelPro. All rights reserved.</p>
      </div>
      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12 bg-ink-50 dark:bg-ink-950 relative">
        <div className="absolute top-6 left-6 lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-md">
          <div className="mb-8 text-center sm:text-left">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 mb-4">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-ink-50">{title}</h1>
            <p className="mt-1 text-ink-500 dark:text-ink-400">{subtitle}</p>
          </div>
          <div className="card p-6 sm:p-8 dark:bg-ink-900 dark:border-ink-800">{children}</div>
        </div>
      </div>
    </div>
  );
}
