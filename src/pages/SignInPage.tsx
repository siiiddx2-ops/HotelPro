import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { Logo, Spinner } from "../components/ui";
import { Mail, Lock, ArrowRight } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

export default function SignInPage() {
  const { signIn } = useAuth();
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
    navigate(dest ?? "/");
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
      <p className="mt-6 text-center text-sm text-ink-500">
        Don't have an account?{" "}
        <Link to="/signup" className="font-semibold text-primary-700 hover:underline">Create one</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ink-50 dark:bg-ink-950">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      <div className="hidden lg:block relative">
        <img
          src="https://images.pexels.com/photos/14011664/pexels-photo-14011664.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
          alt="Hotel lobby"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink-950/85 to-primary-950/75" />
        <div className="relative h-full flex flex-col justify-between p-12">
          <Logo className="[&_span]:text-white" />
          <div>
            <h2 className="font-display text-4xl font-semibold text-white leading-tight">
              The complete hotel management platform.
            </h2>
            <p className="mt-4 text-white/80 max-w-md">
              Secure bookings, real-time operations, and powerful analytics — for guests, staff, and administrators.
            </p>
          </div>
          <p className="text-white/60 text-sm">© 2026 HotelPro. All rights reserved.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12 bg-ink-50 dark:bg-ink-950">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-ink-50">{title}</h1>
          <p className="mt-1 text-ink-500 dark:text-ink-400">{subtitle}</p>
          <div className="mt-8 card p-6 sm:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
