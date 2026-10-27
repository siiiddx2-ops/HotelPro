import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import { formatDateTime, timeAgo } from "../../lib/utils";
import { Spinner, StatusBadge, EmptyState } from "../../components/ui";
import { Sparkles, Loader2, BedDouble, Wrench } from "lucide-react";

type Tab = "requests" | "rooms";

export default function HousekeepingPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>("requests");
  const [requests, setRequests] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [r, rm] = await Promise.all([
        supabase.from("service_requests")
          .select("*, guest:profiles!service_requests_guest_id_fkey(full_name), room:rooms(room_number)")
          .order("created_at", { ascending: false }),
        supabase.from("rooms").select("*, hotel:hotels(name), category:room_categories(name)").order("room_number"),
      ]);
      setRequests(r.data ?? []);
      setRooms(rm.data ?? []);
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [push]);

  async function setReqStatus(id: string, status: any) {
    setWorking(id);
    try {
      await supabase.from("service_requests").update({ status }).eq("id", id);
      push("Request updated.", "success");
      load();
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setWorking(null);
    }
  }

  async function setRoomStatus(id: string, status: any) {
    setWorking(id);
    try {
      await supabase.from("rooms").update({ status }).eq("id", id);
      push("Room status updated.", "success");
      load();
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setWorking(null);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Housekeeping & Services</h1>
        <p className="mt-1 text-ink-500">Manage service requests and room cleaning status.</p>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setTab("requests")} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${tab === "requests" ? "bg-primary-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}>
          Service Requests
        </button>
        <button onClick={() => setTab("rooms")} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${tab === "rooms" ? "bg-primary-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}>
          Room Status
        </button>
      </div>

      {tab === "requests" ? (
        requests.length === 0 ? (
          <EmptyState icon={<Wrench className="h-12 w-12" />} title="No service requests" description="All caught up." />
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="card p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink-900 capitalize">{r.type.replace("_", " ")}</h3>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-sm text-ink-600">{r.description || "—"}</p>
                  <p className="mt-2 text-xs text-ink-400">{r.guest?.full_name} · Room {r.room?.room_number ?? "—"} · {r.created_at ? timeAgo(r.created_at) : ""}</p>
                </div>
                {r.status !== "done" && r.status !== "cancelled" && (
                  <div className="flex gap-2">
                    {r.status === "open" && (
                      <button onClick={() => setReqStatus(r.id, "in_progress")} disabled={working === r.id} className="btn-secondary text-xs">
                        {working === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Start"}
                      </button>
                    )}
                    {r.status === "in_progress" && (
                      <button onClick={() => setReqStatus(r.id, "done")} disabled={working === r.id} className="btn-primary text-xs">
                        {working === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark done"}
                      </button>
                    )}
                    <button onClick={() => setReqStatus(r.id, "cancelled")} disabled={working === r.id} className="btn-ghost text-xs">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-ink-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Room</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Hotel</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-ink-50">
                    <td className="px-4 py-3 font-medium text-ink-900">Room {r.room_number}</td>
                    <td className="px-4 py-3 text-ink-600">{r.category?.name}</td>
                    <td className="px-4 py-3 text-ink-600">{r.hotel?.name}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <select
                        value={r.status}
                        disabled={working === r.id}
                        onChange={(e) => setRoomStatus(r.id, e.target.value)}
                        className="input inline-block w-auto text-xs py-1.5"
                      >
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="cleaning">Cleaning</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="reserved">Reserved</option>
                      </select>
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
