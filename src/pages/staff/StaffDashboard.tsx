import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { formatCurrency, formatDate, todayISO } from "../../lib/utils";
import { StatCard, Spinner, StatusBadge, EmptyState } from "../../components/ui";
import { CalendarCheck, BedDouble, Users, DollarSign, LogIn, Sparkles, ArrowRight } from "lucide-react";

export default function StaffDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ arrivals: 0, departures: 0, inHouse: 0, occupancy: 0, revenue: 0, openRequests: 0 });
  const [arrivals, setArrivals] = useState<any[]>([]);
  const [departures, setDepartures] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const today = todayISO();
        const [b, r, rooms, pays] = await Promise.all([
          supabase.from("bookings").select("*, guest:profiles!bookings_guest_id_fkey(full_name), room:rooms(room_number, category:room_categories(name))").in("status", ["confirmed","checked_in","checked_out"]),
          supabase.from("service_requests").select("*, guest:profiles!service_requests_guest_id_fkey(full_name), room:rooms(room_number)").eq("status", "open").order("created_at", { ascending: false }).limit(5),
          supabase.from("rooms").select("id, status"),
          supabase.from("payments").select("amount").eq("status", "paid"),
        ]);
        const bookings = b.data ?? [];
        const arr = bookings.filter((x) => x.check_in === today && x.status === "confirmed");
        const dep = bookings.filter((x) => x.check_out === today && (x.status === "checked_in" || x.status === "confirmed"));
        const inHouse = bookings.filter((x) => x.status === "checked_in");
        const roomList = rooms.data ?? [];
        const occ = roomList.length ? Math.round((roomList.filter((x: any) => x.status === "occupied").length / roomList.length) * 100) : 0;
        const revenue = (pays.data ?? []).reduce((s: number, x: any) => s + Number(x.amount), 0);
        setStats({ arrivals: arr.length, departures: dep.length, inHouse: inHouse.length, occupancy: occ, revenue, openRequests: (r.data ?? []).length });
        setArrivals(arr.slice(0, 5));
        setDepartures(dep.slice(0, 5));
        setRequests(r.data ?? []);
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
        <h1 className="section-title">Staff Dashboard</h1>
        <p className="mt-1 text-ink-500">Today's arrivals, departures, and operations.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's arrivals" value={stats.arrivals} icon={<LogIn className="h-5 w-5" />} accent="accent" />
        <StatCard label="Today's departures" value={stats.departures} icon={<LogIn className="h-5 w-5" />} accent="primary" />
        <StatCard label="In-house guests" value={stats.inHouse} icon={<Users className="h-5 w-5" />} accent="green" />
        <StatCard label="Occupancy" value={`${stats.occupancy}%`} icon={<BedDouble className="h-5 w-5" />} accent="primary" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Today's arrivals</h2>
          {arrivals.length === 0 ? (
            <p className="text-sm text-ink-500">No arrivals scheduled today.</p>
          ) : (
            <div className="space-y-3">
              {arrivals.map((b) => (
                <Link key={b.id} to="/staff/checkin" className="flex items-center justify-between rounded-lg border border-ink-100 p-3 hover:bg-ink-50">
                  <div>
                    <p className="font-medium text-ink-900">{b.guest?.full_name || "Guest"}</p>
                    <p className="text-xs text-ink-500">Room {b.room?.room_number} · {b.room?.category?.name}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Today's departures</h2>
          {departures.length === 0 ? (
            <p className="text-sm text-ink-500">No departures scheduled today.</p>
          ) : (
            <div className="space-y-3">
              {departures.map((b) => (
                <Link key={b.id} to="/staff/checkin" className="flex items-center justify-between rounded-lg border border-ink-100 p-3 hover:bg-ink-50">
                  <div>
                    <p className="font-medium text-ink-900">{b.guest?.full_name || "Guest"}</p>
                    <p className="text-xs text-ink-500">Room {b.room?.room_number} · {formatDate(b.check_out)}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-ink-900">Open service requests</h2>
          <Link to="/staff/housekeeping" className="text-sm font-medium text-primary-700 hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {requests.length === 0 ? (
          <EmptyState icon={<Sparkles className="h-10 w-10" />} title="No open requests" />
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-ink-100 p-3">
                <div>
                  <p className="font-medium text-ink-900 capitalize">{r.type.replace("_", " ")}</p>
                  <p className="text-xs text-ink-500">{r.guest?.full_name} · Room {r.room?.room_number}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
