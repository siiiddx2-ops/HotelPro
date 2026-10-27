import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Hotel } from "lucide-react";

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function FullPageLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-ink-50">
      <Spinner className="h-8 w-8 text-primary-600" />
      <p className="text-ink-500 text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon, title, description, action,
}: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-ink-300">{icon}</div>}
      <h3 className="font-display text-lg font-semibold text-ink-800">{title}</h3>
      {description && <p className="mt-1 text-sm text-ink-500 max-w-md">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatCard({
  label, value, icon, accent = "primary",
}: { label: string; value: ReactNode; icon: ReactNode; accent?: "primary" | "accent" | "green" | "red" }) {
  const colors: Record<string, string> = {
    primary: "bg-primary-50 text-primary-700",
    accent: "bg-accent-50 text-accent-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-500">{label}</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink-900">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[accent]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function Badge({
  children, tone = "neutral",
}: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue" }) {
  const tones: Record<string, string> = {
    neutral: "bg-ink-100 text-ink-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-primary-100 text-primary-700",
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function Logo({ to = "/", className = "" }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={`flex items-center gap-2 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white">
        <Hotel className="h-5 w-5" />
      </span>
      <span className="font-display text-xl font-semibold text-ink-900">HotelPro</span>
    </Link>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: "neutral" | "green" | "amber" | "red" | "blue"; label: string }> = {
    available: { tone: "green", label: "Available" },
    occupied: { tone: "red", label: "Occupied" },
    reserved: { tone: "amber", label: "Reserved" },
    cleaning: { tone: "amber", label: "Cleaning" },
    maintenance: { tone: "neutral", label: "Maintenance" },
    pending: { tone: "amber", label: "Pending" },
    confirmed: { tone: "blue", label: "Confirmed" },
    checked_in: { tone: "green", label: "Checked in" },
    checked_out: { tone: "neutral", label: "Checked out" },
    cancelled: { tone: "red", label: "Cancelled" },
    refunded: { tone: "neutral", label: "Refunded" },
    paid: { tone: "green", label: "Paid" },
    failed: { tone: "red", label: "Failed" },
    open: { tone: "amber", label: "Open" },
    in_progress: { tone: "blue", label: "In progress" },
    done: { tone: "green", label: "Done" },
  };
  const cfg = map[status] ?? { tone: "neutral" as const, label: status };
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}
