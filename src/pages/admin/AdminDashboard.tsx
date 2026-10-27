import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { formatCurrency, formatDate, todayISO } from "../../lib/utils";
import { StatCard, Spinner, StatusBadge } from "../../components/ui";
import {
  Building2, BedDouble, CalendarCheck, DollarSign, Users, TrendingUp,
  ArrowRight, Star,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    hotels: 0, rooms: 0, bookings: 0, revenue: 0, guests: 0, staff: 0, occupancy: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);
  const [chart, setChart] = useState<{ date: string; revenue: number; bookings: number }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [h, r, b, p, u] = await Promise.all([
          supabase.from("hotels").select("id", { count: "exact", head: true }),
          supabase.from("rooms").select("id, status"),
          supabase.from("bookings").select("id, status, total_amount, created_at"),
          supabase.from("payments").select("amount, status").eq("status", "paid"),
          supabase.from("profiles").select("id, role"),
        ]);
        const roomList = r.data ?? [];
        const bookings = b.data ?? [];
        const revenue = (p.data ?? []).reduce((s: number, x: any) => s + Number(x.amount), 0);
        const occ = roomList.length ? Math.round((roomList.filter((x: any) => x.status === "occupied").length / roomList.length) * 100) : 0;
        const guests = (u.data ?? []).filter((x: any) => x.role === "guest").length;
        const staff = (u.data ?? []).filter((x: any) => x.role === "staff").length;
        setStats({
          hotels: h.count ?? 0,
          rooms: roomList.length,
          bookings: bookings.length,
          revenue,
          guests,
          staff,
          occupancy: occ,
        });
        setRecent(bookings.slice(0, 5));

        // build last 7 days chart
        const map: Record<string, { revenue: number; bookings: number }> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split("T")[0];
          map[key] = { revenue: 0, bookings: 0 };
        }
        for (const bk of bookings) {
          const key = (bk.created_at ?? "").slice(0, 10);
          if (map[key]) {
            map[key].bookings += 1;
            if (bk.status !== "cancelled") map[key].revenue += Number(bk.total_amount);
          }
        }
        setChart(Object.entries(map).map(([date, v]) => ({ date: date.slice(5), revenue: v.revenue, bookings: v.bookings })));
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Admin Dashboard</h1>
        <p className="mt-1 text-ink-500">Overview of your hotel portfolio performance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Hotels" value={stats.hotels} icon={<Building2 className="h-5 w-5" />} accent="primary" />
        <StatCard label="Total rooms" value={stats.rooms} icon={<BedDouble className="h-5 w-5" />} accent="accent" />
        <StatCard label="Bookings" value={stats.bookings} icon={<CalendarCheck className="h-5 w-5" />} accent="green" />
        <StatCard label="Revenue" value={formatCurrency(stats.revenue)} icon={<DollarSign className="h-5 w-5" />} accent="primary" />
        <StatCard label="Guests" value={stats.guests} icon={<Users className="h-5 w-5" />} accent="accent" />
        <StatCard label="Staff" value={stats.staff} icon={<Users className="h-5 w-5" />} accent="primary" />
        <StatCard label="Occupancy" value={`${stats.occupancy}%`} icon={<TrendingUp className="h-5 w-5" />} accent="green" />
        <StatCard label="Avg rating" value="4.9" icon={<Star className="h-5 w-5" />} accent="accent" />
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-ink-900">Revenue & bookings (last 7 days)</h2>
          <Link to="/admin/reports" className="text-sm font-medium text-primary-700 hover:underline flex items-center gap-1">
            Full reports <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chart}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1b6ff5" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#1b6ff5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Area type="monotone" dataKey="revenue" stroke="#1b6ff5" strokeWidth={2} fill="url(#rev)" name="Revenue ($)" />
            <Area type="monotone" dataKey="bookings" stroke="#f59e0b" strokeWidth={2} fill="url(#bk)" name="Bookings" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-ink-900">Recent bookings</h2>
          <Link to="/admin/bookings" className="text-sm font-medium text-primary-700 hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-ink-500">No bookings yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border border-ink-100 p-3">
                <div>
                  <p className="font-medium text-ink-900">{formatCurrency(b.total_amount)}</p>
                  <p className="text-xs text-ink-500">{b.created_at ? formatDate(b.created_at) : ""}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
