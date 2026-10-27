import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import { createNotification } from "../../lib/data";
import { formatCurrency, formatDate, todayISO } from "../../lib/utils";
import { Spinner, StatusBadge, EmptyState } from "../../components/ui";
import { LogIn, LogOut, Loader2, Search } from "lucide-react";

type Tab = "arrivals" | "departures" | "inhouse";

export default function CheckInOutPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>("arrivals");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, guest:profiles!bookings_guest_id_fkey(full_name, email), room:rooms(id, room_number, status, category:room_categories(name)), hotel:hotels(name)")
        .in("status", ["confirmed", "checked_in"])
        .order("check_in");
      if (error) throw error;
      setBookings(data ?? []);
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [push]);

  const today = todayISO();
  const filtered = bookings.filter((b) => {
    if (tab === "arrivals" && !(b.check_in === today && b.status === "confirmed")) return false;
    if (tab === "departures" && !(b.check_out === today && b.status === "checked_in")) return false;
    if (tab === "inhouse" && b.status !== "checked_in") return false;
    if (search) {
      const s = search.toLowerCase();
      return b.guest?.full_name?.toLowerCase().includes(s) || b.room?.room_number?.toLowerCase().includes(s);
    }
    return true;
  });

  async function checkIn(booking: any) {
    setWorking(booking.id);
    try {
      await supabase.from("bookings").update({ status: "checked_in" }).eq("id", booking.id);
      await supabase.from("rooms").update({ status: "occupied" }).eq("id", booking.room_id);
      await createNotification(booking.guest_id, "Checked in", `You've been checked in to Room ${booking.room?.room_number}. Enjoy your stay!`, "booking");
      push(`${booking.guest?.full_name} checked in.`, "success");
      load();
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setWorking(null);
    }
  }

  async function checkOut(booking: any) {
    setWorking(booking.id);
    try {
      await supabase.from("bookings").update({ status: "checked_out" }).eq("id", booking.id);
      await supabase.from("rooms").update({ status: "cleaning" }).eq("id", booking.room_id);
      await createNotification(booking.guest_id, "Checked out", `Your stay at ${booking.hotel?.name} is complete. We hope to see you again!`, "booking");
      push(`${booking.guest?.full_name} checked out. Room set to cleaning.`, "success");
      load();
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Check-In / Check-Out</h1>
        <p className="mt-1 text-ink-500">Process guest arrivals and departures.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex gap-1.5">
          {(["arrivals", "departures", "inhouse"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition ${
                tab === t ? "bg-primary-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}>{t.replace("_", " ")}</button>
          ))}
        </div>
        <div className="relative md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guest or room..." className="input pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-primary-600" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<LogIn className="h-12 w-12" />} title={`No ${tab} right now`} description="Check back later or switch tabs." />
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className="card p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-ink-900">{b.guest?.full_name || "Guest"}</h3>
                  <StatusBadge status={b.status} />
                </div>
                <p className="text-sm text-ink-500">{b.guest?.email}</p>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-500">
                  <span>Room {b.room?.room_number} · {b.room?.category?.name}</span>
                  <span>Check-in: {formatDate(b.check_in)}</span>
                  <span>Check-out: {formatDate(b.check_out)}</span>
                  <span>Guests: {b.guests}</span>
                  <span>Total: {formatCurrency(b.total_amount)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {b.status === "confirmed" && (
                  <button onClick={() => checkIn(b)} disabled={working === b.id} className="btn-primary">
                    {working === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogIn className="h-4 w-4" /> Check in</>}
                  </button>
                )}
                {b.status === "checked_in" && (
                  <button onClick={() => checkOut(b)} disabled={working === b.id} className="btn-secondary">
                    {working === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4" /> Check out</>}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
