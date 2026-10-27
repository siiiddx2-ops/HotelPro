import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { formatCurrency, formatDate, todayISO, addDays } from "../../lib/utils";
import { StatCard, EmptyState, StatusBadge, Spinner } from "../../components/ui";
import { CalendarCheck, BedDouble, CreditCard, Star, ArrowRight, Clock } from "lucide-react";

export default function GuestDashboard() {
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, spent: 0, nights: 0 });

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select("*, room:rooms(*), hotel:hotels(*), payments(*)")
          .eq("guest_id", session.user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const all = data ?? [];
        const today = todayISO();
        const up = all.filter((b) => b.check_in >= today && b.status !== "cancelled");
        setUpcoming(up.slice(0, 3));
        const spent = all
          .filter((b) => b.status !== "cancelled")
          .reduce((s, b) => s + Number(b.total_amount), 0);
        const nights = all
          .filter((b) => b.status !== "cancelled")
          .reduce((s, b) => s + nightsB(b.check_in, b.check_out), 0);
        setStats({ total: all.length, upcoming: up.length, spent, nights });
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Welcome, {profile?.full_name?.split(" ")[0] || "Guest"}</h1>
        <p className="mt-1 text-ink-500">Here's a snapshot of your stays with HotelPro.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total bookings" value={stats.total} icon={<CalendarCheck className="h-5 w-5" />} accent="primary" />
        <StatCard label="Upcoming stays" value={stats.upcoming} icon={<BedDouble className="h-5 w-5" />} accent="accent" />
        <StatCard label="Total spent" value={formatCurrency(stats.spent)} icon={<CreditCard className="h-5 w-5" />} accent="green" />
        <StatCard label="Nights stayed" value={stats.nights} icon={<Star className="h-5 w-5" />} accent="primary" />
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-ink-900">Upcoming stays</h2>
          <Link to="/guest/bookings" className="text-sm font-medium text-primary-700 hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<BedDouble className="h-10 w-10" />}
            title="No upcoming stays"
            description="Browse our rooms and book your next getaway."
            action={<Link to="/guest/rooms" className="btn-primary">Browse rooms</Link>}
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((b) => (
              <Link key={b.id} to={`/guest/bookings/${b.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-ink-100 p-4 hover:bg-ink-50 transition">
                <div className="flex items-center gap-4">
                  <img src={b.room?.image_url || "https://images.pexels.com/photos/2725675/pexels-photo-2725675.jpeg?auto=compress&cs=tinysrgb&h=200&w=200"}
                    alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <div>
                    <p className="font-semibold text-ink-900">{b.hotel?.name}</p>
                    <p className="text-sm text-ink-500">Room {b.room?.room_number} · {b.room?.category?.name ?? "Room"}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-ink-500">
                      <Clock className="h-3.5 w-3.5" /> {formatDate(b.check_in)} → {formatDate(b.check_out)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={b.status} />
                  <p className="mt-2 font-semibold text-ink-900">{formatCurrency(b.total_amount)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function nightsB(a: string, b: string) {
  return Math.max(0, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}
