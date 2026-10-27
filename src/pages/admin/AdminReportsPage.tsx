import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../lib/utils";
import { Spinner, StatCard } from "../../components/ui";
import { DollarSign, CalendarCheck, BedDouble, Star, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  available: "#22c55e", occupied: "#ef4444", reserved: "#f59e0b", cleaning: "#8b5cf6", maintenance: "#64748b",
};

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ revenue: 0, bookings: 0, avgValue: 0, cancelled: 0, occupancy: 0, avgRating: 0 });
  const [revenueData, setRevenueData] = useState<{ date: string; revenue: number }[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [hotelData, setHotelData] = useState<{ name: string; bookings: number; revenue: number }[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<{ status: string; count: number }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [b, p, rooms, hotels, revs] = await Promise.all([
          supabase.from("bookings").select("id, status, total_amount, created_at, hotel_id"),
          supabase.from("payments").select("amount, status").eq("status", "paid"),
          supabase.from("rooms").select("id, status, hotel_id"),
          supabase.from("hotels").select("id, name"),
          supabase.from("reviews").select("rating"),
        ]);
        const bookings = b.data ?? [];
        const pays = p.data ?? [];
        const roomList = rooms.data ?? [];
        const hotelList = hotels.data ?? [];
        const reviews = revs.data ?? [];

        const revenue = pays.reduce((s: number, x: any) => s + Number(x.amount), 0);
        const cancelled = bookings.filter((x) => x.status === "cancelled").length;
        const occ = roomList.length ? Math.round((roomList.filter((x: any) => x.status === "occupied").length / roomList.length) * 100) : 0;
        const avgRating = reviews.length ? (reviews.reduce((s: number, x: any) => s + x.rating, 0) / reviews.length).toFixed(1) : "—";
        const avgValue = bookings.length ? revenue / bookings.length : 0;
        setStats({ revenue, bookings: bookings.length, avgValue, cancelled, occupancy: occ, avgRating: avgRating as any });

        // revenue last 14 days
        const map: Record<string, number> = {};
        for (let i = 13; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          map[d.toISOString().split("T")[0]] = 0;
        }
        for (const bk of bookings) {
          const key = (bk.created_at ?? "").slice(0, 10);
          if (key in map && bk.status !== "cancelled") map[key] += Number(bk.total_amount);
        }
        setRevenueData(Object.entries(map).map(([date, v]) => ({ date: date.slice(5), revenue: v })));

        // room status pie
        const statusCount: Record<string, number> = {};
        for (const r of roomList) statusCount[r.status] = (statusCount[r.status] ?? 0) + 1;
        setStatusData(Object.entries(statusCount).map(([name, value]) => ({ name, value })));

        // hotel performance
        const hotelAgg: Record<string, { bookings: number; revenue: number }> = {};
        for (const h of hotelList) hotelAgg[h.id] = { bookings: 0, revenue: 0 };
        for (const bk of bookings) {
          if (hotelAgg[bk.hotel_id]) {
            hotelAgg[bk.hotel_id].bookings += 1;
            if (bk.status !== "cancelled") hotelAgg[bk.hotel_id].revenue += Number(bk.total_amount);
          }
        }
        setHotelData(hotelList.map((h) => ({ name: h.name, bookings: hotelAgg[h.id]?.bookings ?? 0, revenue: hotelAgg[h.id]?.revenue ?? 0 })));

        // booking status breakdown
        const bkStatus: Record<string, number> = {};
        for (const bk of bookings) bkStatus[bk.status] = (bkStatus[bk.status] ?? 0) + 1;
        setStatusBreakdown(Object.entries(bkStatus).map(([status, count]) => ({ status, count })));
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
        <h1 className="section-title">Reports & Analytics</h1>
        <p className="mt-1 text-ink-500">Track revenue, occupancy, and performance across your portfolio.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total revenue" value={formatCurrency(stats.revenue)} icon={<DollarSign className="h-5 w-5" />} accent="green" />
        <StatCard label="Total bookings" value={stats.bookings} icon={<CalendarCheck className="h-5 w-5" />} accent="primary" />
        <StatCard label="Avg booking value" value={formatCurrency(stats.avgValue)} icon={<TrendingUp className="h-5 w-5" />} accent="accent" />
        <StatCard label="Occupancy" value={`${stats.occupancy}%`} icon={<BedDouble className="h-5 w-5" />} accent="primary" />
        <StatCard label="Cancelled" value={stats.cancelled} icon={<CalendarCheck className="h-5 w-5" />} accent="red" />
        <StatCard label="Avg rating" value={stats.avgRating} icon={<Star className="h-5 w-5" />} accent="accent" />
      </div>

      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Revenue trend (14 days)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Line type="monotone" dataKey="revenue" stroke="#1b6ff5" strokeWidth={3} dot={{ r: 3 }} name="Revenue ($)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Room status distribution</h2>
          {statusData.length === 0 ? (
            <p className="text-sm text-ink-500">No rooms data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Bookings by status</h2>
          {statusBreakdown.length === 0 ? (
            <p className="text-sm text-ink-500">No bookings yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="count" fill="#1b6ff5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Hotel performance</h2>
        {hotelData.length === 0 ? (
          <p className="text-sm text-ink-500">No hotels yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-ink-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Hotel</th>
                  <th className="px-4 py-3 font-medium">Bookings</th>
                  <th className="px-4 py-3 font-medium">Revenue</th>
                  <th className="px-4 py-3 font-medium">Avg value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {hotelData.map((h) => (
                  <tr key={h.name} className="hover:bg-ink-50">
                    <td className="px-4 py-3 font-medium text-ink-900">{h.name}</td>
                    <td className="px-4 py-3">{h.bookings}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(h.revenue)}</td>
                    <td className="px-4 py-3">{formatCurrency(h.bookings ? h.revenue / h.bookings : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
