import { useEffect, useState } from "react";
import { supabase, type NotificationItem } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { Spinner, EmptyState } from "../components/ui";
import { Bell, Check, Trash2, Loader2 } from "lucide-react";
import { timeAgo } from "../lib/utils";

const typeIcon: Record<string, string> = {
  booking: "bg-primary-50 text-primary-700",
  payment: "bg-green-50 text-green-700",
  system: "bg-ink-100 text-ink-700",
  service: "bg-accent-50 text-accent-700",
  info: "bg-primary-50 text-primary-700",
};

export default function NotificationsPage() {
  const { session } = useAuth();
  const { push } = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setItems(data ?? []);
      } catch (e) {
        push((e as Error).message, "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [session, push]);

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function markAllRead() {
    if (!session) return;
    setWorking(true);
    await supabase.from("notifications").update({ read: true }).eq("user_id", session.user.id).eq("read", false);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setWorking(false);
    push("All marked as read.", "success");
  }

  async function remove(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Notifications</h1>
          <p className="mt-1 text-ink-500">Stay up to date on your bookings and account activity.</p>
        </div>
        {items.some((n) => !n.read) && (
          <button onClick={markAllRead} disabled={working} className="btn-secondary">
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Mark all read</>}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-primary-600" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Bell className="h-12 w-12" />} title="No notifications" description="You're all caught up." />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className={`card p-4 flex items-start gap-3 ${!n.read ? "border-primary-200 bg-primary-50/40" : ""}`}>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${typeIcon[n.type] ?? typeIcon.info}`}>
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink-900">{n.title}</p>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary-600" />}
                </div>
                {n.body && <p className="text-sm text-ink-600 mt-0.5">{n.body}</p>}
                <p className="text-xs text-ink-400 mt-1">{n.created_at ? timeAgo(n.created_at) : ""}</p>
              </div>
              <div className="flex gap-1">
                {!n.read && (
                  <button onClick={() => markRead(n.id)} className="p-1.5 text-ink-400 hover:text-green-600" title="Mark read">
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => remove(n.id)} className="p-1.5 text-ink-400 hover:text-red-600" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
