import { useEffect, useState } from "react";
import { supabase, type ServiceRequest } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/Toast";
import { formatDateTime, timeAgo } from "../../lib/utils";
import { Spinner, EmptyState, StatusBadge } from "../../components/ui";
import { Wrench, Send, Loader2, Sparkles } from "lucide-react";

const types = [
  { value: "housekeeping", label: "Housekeeping" },
  { value: "room_service", label: "Room Service" },
  { value: "maintenance", label: "Maintenance" },
  { value: "laundry", label: "Laundry" },
  { value: "other", label: "Other" },
] as const;

export default function ServiceRequestsPage() {
  const { session } = useAuth();
  const { push } = useToast();
  const [items, setItems] = useState<(ServiceRequest & { room?: any; hotel?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<ServiceRequest["type"]>("housekeeping");
  const [description, setDescription] = useState("");
  const [roomId, setRoomId] = useState("");
  const [myRooms, setMyRooms] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const [reqs, rooms] = await Promise.all([
          supabase
            .from("service_requests")
            .select("*, room:rooms(*), hotel:hotels(*)")
            .eq("guest_id", session.user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("bookings")
            .select("room:rooms(id, room_number, hotel:hotels(name))")
            .eq("guest_id", session.user.id)
            .in("status", ["confirmed", "checked_in"]),
        ]);
        if (reqs.error) throw reqs.error;
        setItems(reqs.data ?? []);
        const uniq: any[] = [];
        const seen = new Set<string>();
        for (const b of (rooms.data ?? []) as any[]) {
          const room = Array.isArray(b.room) ? b.room[0] : b.room;
          if (room && !seen.has(room.id)) { uniq.push(room); seen.add(room.id); }
        }
        setMyRooms(uniq);
      } catch (e) {
        push((e as Error).message, "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [session, push]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session || myRooms.length === 0) {
      push("Book a room first to request services.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const room = myRooms.find((r) => r.id === roomId) ?? myRooms[0];
      const { data, error } = await supabase
        .from("service_requests")
        .insert({
          guest_id: session.user.id,
          hotel_id: items[0]?.hotel_id ?? (room as any).hotel?.id ?? room.hotel_id,
          room_id: room.id,
          type,
          description: description.trim(),
          status: "open",
        })
        .select("*, room:rooms(*), hotel:hotels(*)")
        .single();
      if (error) throw error;
      setItems((prev) => [data as any, ...prev]);
      setDescription("");
      push("Service request submitted!", "success");
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Service Requests</h1>
        <p className="mt-1 text-ink-500">Request housekeeping, room service, or maintenance during your stay.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <h2 className="font-display text-lg font-semibold text-ink-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-600" /> New request
          </h2>
          {myRooms.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">Book a room to start making service requests.</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="label">Room</label>
                <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="input">
                  {myRooms.map((r) => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Service type</label>
                <select value={type} onChange={(e) => setType(e.target.value as ServiceRequest["type"])} className="input">
                  {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Details</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  placeholder="Describe what you need..." className="input" />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Submit request</>}
              </button>
            </form>
          )}
        </div>

        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-primary-600" /></div>
          ) : items.length === 0 ? (
            <EmptyState icon={<Wrench className="h-12 w-12" />} title="No requests yet" description="Your service requests will appear here." />
          ) : (
            items.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-ink-900 capitalize">{r.type.replace("_", " ")}</h3>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink-600">{r.description || "—"}</p>
                    <p className="mt-2 text-xs text-ink-400">
                      Room {r.room?.room_number ?? "—"} · {r.hotel?.name ?? ""} · {r.created_at ? timeAgo(r.created_at) : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
