import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { formatDateTime } from "../../lib/utils";
import { Spinner, EmptyState, Badge } from "../../components/ui";
import { ScrollText, Search } from "lucide-react";

const actionTone: Record<string, "neutral" | "green" | "amber" | "red" | "blue"> = {
  role_change: "amber",
  staff_assignment: "blue",
  booking_status: "green",
  check_in: "green",
  check_out: "neutral",
  cancellation: "red",
  payment: "green",
  refund: "red",
  room_status: "blue",
};

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("activity_logs")
          .select("*, actor:profiles!activity_logs_actor_id_fkey(full_name)")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        setLogs(data ?? []);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const actions = [...new Set(logs.map((l) => l.action))];

  const filtered = logs.filter((l) => {
    if (actionFilter && l.action !== actionFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return l.actor?.full_name?.toLowerCase().includes(s) || l.action?.toLowerCase().includes(s) || l.details?.toLowerCase().includes(s);
    }
    return true;
  });

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Activity Logs</h1>
        <p className="mt-1 text-ink-500 dark:text-ink-400">Audit trail of all admin and staff actions.</p>
      </div>

      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by actor, action, or details..." className="input pl-9" />
        </div>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="input md:w-48">
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<ScrollText className="h-12 w-12" />} title="No activity logged" description="Actions by staff and admins will appear here." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-ink-500 text-left dark:bg-ink-900/50 dark:text-ink-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-700">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-ink-50 dark:hover:bg-ink-800/50">
                    <td className="px-4 py-3 font-medium text-ink-900 dark:text-ink-100">{l.actor?.full_name || "System"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={actionTone[l.action] ?? "neutral"}>{l.action.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-300 text-xs">{l.details || "—"}</td>
                    <td className="px-4 py-3 text-xs text-ink-500">{l.created_at ? formatDateTime(l.created_at) : "—"}</td>
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
