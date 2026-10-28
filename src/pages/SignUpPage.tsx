import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, type Role } from "../lib/auth";
import { useToast } from "../components/Toast";
import { AuthShell } from "./SignInPage";
import { Spinner } from "../components/ui";
import { User, Mail, Lock, ArrowRight, Users, BedDouble, ShieldCheck } from "lucide-react";

const roles: { value: Role; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "guest", label: "Guest", icon: <Users className="h-5 w-5" />, desc: "Book rooms & manage stays" },
  { value: "staff", label: "Staff", icon: <BedDouble className="h-5 w-5" />, desc: "Check-ins & operations" },
  { value: "admin", label: "Admin", icon: <ShieldCheck className="h-5 w-5" />, desc: "Full hotel oversight" },
];

export default function SignUpPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("guest");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      push("Password must be at least 6 characters.", "error");
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim(), password, fullName.trim(), role);
    setLoading(false);
    if (error) {
      push(error, "error");
      return;
    }
    push("Account created! Welcome to HotelPro.", "success");
    navigate(role === "admin" ? "/admin" : role === "staff" ? "/staff" : "/guest");
  }

  return (
    <AuthShell title="Create your account" subtitle="Choose your role and get started in seconds.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">I am a...</label>
          <div className="grid grid-cols-3 gap-2">
            {roles.map((r) => (
              <button
                key={r.value} type="button" onClick={() => setRole(r.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${
                  role === r.value
                    ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-500"
                    : "border-ink-200 bg-white text-ink-600 hover:border-ink-300 dark:bg-ink-800 dark:border-ink-700 dark:text-ink-300 dark:hover:border-ink-600"
                }`}
              >
                {r.icon}
                <span className="text-sm font-semibold">{r.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">{roles.find((r) => r.value === role)?.desc}</p>
        </div>
        <div>
          <label className="label">Full name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe" className="input pl-9" />
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@hotel.com" className="input pl-9" />
          </div>
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters" className="input pl-9" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Spinner className="h-4 w-4" /> : <>Create account <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
        Already have an account?{" "}
        <Link to="/signin" className="font-semibold text-primary-700 hover:underline dark:text-primary-400">Sign in</Link>
      </p>
    </AuthShell>
  );
}
