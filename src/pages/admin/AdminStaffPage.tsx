import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import { formatDate } from "../../lib/utils";
import { Spinner, EmptyState, Badge } from "../../components/ui";
import { Users, Loader2, Search, Building2, UserPlus, Trash2, X } from "lucide-react";

export default function AdminStaffPage() {
  const { push } = useToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ user_id: "", hotel_id: "", department: "frontdesk" });

  async function load() {
    setLoading(true);
    try {
      const [p, a, h] = await Promise.all([
        supabase.from("profiles").select("id, role, full_name, phone, created_at, hotel_id").order("created_at", { ascending: false }),
        supabase.from("staff_assignments").select("*, user:profiles!staff_assignments_user_id_fkey(full_name, phone), hotel:hotels(name)").order("created_at", { ascending: false }),
        supabase.from("hotels").select("id, name").order("name"),
      ]);
      if (p.error) throw p.error;
      setProfiles(p.data ?? []);
      setAssignments(a.data ?? []);
      setHotels(h.data ?? []);
    } catch (e) {
      push("Could not load staff data.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const guests = profiles.filter((p) => p.role === "guest");
  const staff = profiles.filter((p) => p.role === "staff");
  const admins = profiles.filter((p) => p.role === "admin");

  const filtered = profiles.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.full_name?.toLowerCase().includes(s) || p.phone?.toLowerCase().includes(s);
  });

  async function setRole(id: string, role: string) {
    setWorking(id);
    try {
      const { error } = await supabase.rpc("set_user_role", { p_target_user: id, p_role: role });
      if (error) throw error;
      push("Role updated.", "success");
      load();
    } catch (e) {
      push("Could not update role.", "error");
    } finally {
      setWorking(null);
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignForm.user_id || !assignForm.hotel_id) {
      push("Select a user and hotel.", "error");
      return;
    }
    setWorking("assign");
    try {
      const { error } = await supabase.rpc("assign_staff", {
        p_user_id: assignForm.user_id,
        p_hotel_id: assignForm.hotel_id,
        p_department: assignForm.department,
      });
      if (error) throw error;
      push("Staff assigned.", "success");
      setShowAssign(false);
      load();
    } catch (e) {
      push("Could not assign staff.", "error");
    } finally {
      setWorking(null);
    }
  }

  async function removeAssignment(id: string) {
    if (!confirm("Remove this staff assignment?")) return;
    setWorking(id);
    try {
      const { error } = await supabase.rpc("remove_staff_assignment", { p_assignment_id: id });
      if (error) throw error;
      push("Assignment removed.", "success");
      load();
    } catch (e) {
      push("Could not remove assignment.", "error");
    } finally {
      setWorking(null);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="section-title">Users & Staff</h1>
          <p className="mt-1 text-ink-500 dark:text-ink-400">Manage user roles and staff assignments.</p>
        </div>
        <button onClick={() => setShowAssign(true)} className="btn-primary">
          <UserPlus className="h-4 w-4" /> Assign staff
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4"><p className="text-sm text-ink-500">Guests</p><p className="font-display text-2xl font-semibold text-ink-900 dark:text-ink-50">{guests.length}</p></div>
        <div className="card p-4"><p className="text-sm text-ink-500">Staff</p><p className="font-display text-2xl font-semibold text-ink-900 dark:text-ink-50">{staff.length}</p></div>
        <div className="card p-4"><p className="text-sm text-ink-500">Admins</p><p className="font-display text-2xl font-semibold text-ink-900 dark:text-ink-50">{admins.length}</p></div>
      </div>

      {/* Staff assignments */}
      <div className="card p-5">
        <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50 mb-4">Staff assignments</h2>
        {assignments.length === 0 ? (
          <EmptyState icon={<Building2 className="h-10 w-10" />} title="No staff assigned yet" description="Assign staff to hotels to get started." />
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-ink-100 dark:border-ink-700 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-ink-900 dark:text-ink-100">{a.user?.full_name || "—"}</p>
                    <p className="text-xs text-ink-500">{a.hotel?.name} · {a.department}</p>
                  </div>
                </div>
                <button onClick={() => removeAssignment(a.id)} disabled={working === a.id} className="text-ink-400 hover:text-red-600 p-1.5">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All users table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 dark:border-ink-700 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">All users</h2>
          <div className="relative w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="input pl-9 text-xs py-2" />
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={<Users className="h-12 w-12" />} title="No users found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-ink-500 text-left dark:bg-ink-900/50 dark:text-ink-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium text-right">Change role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-700">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-ink-50 dark:hover:bg-ink-800/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-900 dark:text-ink-100">{p.full_name || "Unnamed"}</p>
                      <p className="text-xs text-ink-500">{p.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-300 text-xs">{p.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={p.role === "admin" ? "blue" : p.role === "staff" ? "amber" : "neutral"}>{p.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500">{p.created_at ? formatDate(p.created_at) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <select value={p.role} disabled={working === p.id} onChange={(e) => setRole(p.id, e.target.value)} className="input inline-block w-auto text-xs py-1.5">
                        <option value="guest">Guest</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4" onClick={() => setShowAssign(false)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">Assign staff to hotel</h2>
              <button onClick={() => setShowAssign(false)} className="text-ink-400 hover:text-ink-700"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="label">User</label>
                <select value={assignForm.user_id} onChange={(e) => setAssignForm({ ...assignForm, user_id: e.target.value })} className="input">
                  <option value="">Select user...</option>
                  {profiles.filter((p) => p.role !== "admin").map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Hotel</label>
                <select value={assignForm.hotel_id} onChange={(e) => setAssignForm({ ...assignForm, hotel_id: e.target.value })} className="input">
                  <option value="">Select hotel...</option>
                  {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Department</label>
                <select value={assignForm.department} onChange={(e) => setAssignForm({ ...assignForm, department: e.target.value })} className="input">
                  <option value="frontdesk">Front Desk</option>
                  <option value="housekeeping">Housekeeping</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="concierge">Concierge</option>
                  <option value="management">Management</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={working === "assign"} className="btn-primary flex-1">
                  {working === "assign" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
                </button>
                <button type="button" onClick={() => setShowAssign(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
