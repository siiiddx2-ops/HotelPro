import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import { createNotification } from "../../lib/data";
import { formatCurrency, formatDate } from "../../lib/utils";
import { Spinner, StatusBadge, EmptyState } from "../../components/ui";
import { CalendarCheck, Search, Loader2, Check, X } from "lucide-react";

export default function StaffReservationsPage() {
  const { push } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, guest:profiles!bookings_guest_id_fkey(full_name, phone), room:rooms(room_number, category:room_categories(name)), hotel:hotels(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBookings(data ?? []);
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [push]);

  const filtered = bookings.filter((b) => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return b.guest?.full_name?.toLowerCase().includes(s) || b.room?.room_number?.toLowerCase().includes(s) || b.hotel?.name?.toLowerCase().includes(s);
    }
    return true;
  });

  async function setStatus(booking: any, status: any) {
    setWorking(booking.id);
    try {
      await supabase.from("bookings").update({ status }).eq("id", booking.id);
      if (status === "cancelled") {
        await supabase.from("rooms").update({ status: "available" }).eq("id", booking.room_id);
        await createNotification(booking.guest_id, "Booking cancelled", `Your booking for Room ${booking.room?.room_number} was cancelled by staff.`, "booking");
      }
      push("Booking updated.", "success");
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
        <h1 className="section-title">Reservations</h1>
        <p className="mt-1 text-ink-500">View and manage all guest reservations.</p>
      </div>

      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guest, room, hotel..." className="input pl-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input md:w-48">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked in</option>
          <option value="checked_out">Checked out</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-primary-600" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<CalendarCheck className="h-12 w-12" />} title="No reservations found" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-ink-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Guest</th>
                  <th className="px-4 py-3 font-medium">Room</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-ink-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-900">{b.guest?.full_name || "Guest"}</p>
                      <p className="text-xs text-ink-500">{b.guest?.phone || "No phone provided"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{b.room?.room_number}</p>
                      <p className="text-xs text-ink-500">{b.room?.category?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-600">
                      {formatDate(b.check_in)} → {formatDate(b.check_out)}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(b.total_amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {b.status === "pending" && (
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => setStatus(b, "confirmed")} disabled={working === b.id} className="btn-primary px-2.5 py-1.5 text-xs">
                            {working === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3" /> Approve</>}
                          </button>
                          <button onClick={() => setStatus(b, "cancelled")} disabled={working === b.id} className="btn-danger px-2.5 py-1.5 text-xs">
                            <X className="h-3 w-3" /> Reject
                          </button>
                        </div>
                      )}
                      {b.status === "confirmed" && (
                        <button onClick={() => setStatus(b, "cancelled")} disabled={working === b.id} className="btn-danger px-2.5 py-1.5 text-xs">
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
