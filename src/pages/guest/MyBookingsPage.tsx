import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/Toast";
import { formatCurrency, formatDate, timeAgo } from "../../lib/utils";
import { Spinner, EmptyState, StatusBadge } from "../../components/ui";
import { CalendarCheck, Search, BedDouble } from "lucide-react";

type StatusFilter = "all" | "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";

export default function MyBookingsPage() {
  const { session } = useAuth();
  const { push } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

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
        setBookings(data ?? []);
      } catch (e) {
        push((e as Error).message, "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [session, push]);

  const filtered = bookings.filter((b) => {
    if (filter !== "all" && b.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return b.hotel?.name?.toLowerCase().includes(s) || b.room?.room_number?.toLowerCase().includes(s);
    }
    return true;
  });

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">My Bookings</h1>
        <p className="mt-1 text-ink-500">Manage your reservations, payments, and cancellations.</p>
      </div>

      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by hotel or room..." className="input pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["all","confirmed","pending","checked_in","checked_out","cancelled"] as StatusFilter[]).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-2 text-xs font-medium capitalize transition ${
                filter === s ? "bg-primary-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}>{s.replace("_", " ")}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="h-12 w-12" />}
          title="No bookings here"
          description="When you book a room, it'll show up here."
          action={<Link to="/guest/rooms" className="btn-primary">Browse rooms</Link>}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => (
            <Link key={b.id} to={`/guest/bookings/${b.id}`}
              className="card p-5 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-soft transition">
              <img src={b.room?.image_url || "https://images.pexels.com/photos/2725675/pexels-photo-2725675.jpeg?auto=compress&cs=tinysrgb&h=200&w=200"}
                alt="" className="h-24 w-full md:w-32 rounded-lg object-cover" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-semibold text-ink-900">{b.hotel?.name}</h3>
                  <StatusBadge status={b.status} />
                </div>
                <p className="text-sm text-ink-500">Room {b.room?.room_number} · {b.room?.category?.name}</p>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-500">
                  <span><strong className="text-ink-700">Check-in:</strong> {formatDate(b.check_in)}</span>
                  <span><strong className="text-ink-700">Check-out:</strong> {formatDate(b.check_out)}</span>
                  <span><strong className="text-ink-700">Guests:</strong> {b.guests}</span>
                  <span><strong className="text-ink-700">Booked:</strong> {b.created_at ? timeAgo(b.created_at) : "-"}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-semibold text-ink-900">{formatCurrency(b.total_amount)}</p>
                <p className="text-xs text-ink-500 mt-1">{b.payments?.[0]?.status === "paid" ? "Paid" : "Pending payment"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
