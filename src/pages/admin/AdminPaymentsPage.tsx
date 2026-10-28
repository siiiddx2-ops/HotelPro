import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import { formatCurrency, formatDateTime } from "../../lib/utils";
import { Spinner, StatusBadge, EmptyState } from "../../components/ui";
import { CreditCard, Search, Loader2, RefreshCw } from "lucide-react";

export default function AdminPaymentsPage() {
  const { push } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*, guest:profiles!payments_guest_id_fkey(full_name, phone), booking:bookings(room:rooms(room_number, hotel:hotels(name)))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPayments(data ?? []);
    } catch (e) {
      push("Could not load payments.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = payments.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return p.guest?.full_name?.toLowerCase().includes(s) || p.transaction_id?.toLowerCase().includes(s);
    }
    return true;
  });

  const totalRevenue = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const refunded = payments.filter((p) => p.status === "refunded").reduce((s, p) => s + Number(p.amount), 0);
  const pending = payments.filter((p) => p.status === "pending").length;

  async function refundPayment(id: string) {
    if (!confirm("Process a refund for this payment?")) return;
    setWorking(id);
    try {
      const { error } = await supabase.from("payments").update({ status: "refunded" }).eq("id", id);
      if (error) throw error;
      push("Payment refunded.", "success");
      load();
    } catch (e) {
      push("Refund failed.", "error");
    } finally {
      setWorking(null);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Payments</h1>
        <p className="mt-1 text-ink-500 dark:text-ink-400">Track all payment transactions and refunds.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4"><p className="text-sm text-ink-500">Total revenue</p><p className="font-display text-2xl font-semibold text-green-700">{formatCurrency(totalRevenue)}</p></div>
        <div className="card p-4"><p className="text-sm text-ink-500">Refunded</p><p className="font-display text-2xl font-semibold text-red-700">{formatCurrency(refunded)}</p></div>
        <div className="card p-4"><p className="text-sm text-ink-500">Pending</p><p className="font-display text-2xl font-semibold text-amber-700">{pending}</p></div>
      </div>

      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by guest or transaction ID..." className="input pl-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input md:w-44">
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<CreditCard className="h-12 w-12" />} title="No payments found" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-ink-500 text-left dark:bg-ink-900/50 dark:text-ink-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Guest</th>
                  <th className="px-4 py-3 font-medium">Room / Hotel</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Transaction</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-700">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-ink-50 dark:hover:bg-ink-800/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-900 dark:text-ink-100">{p.guest?.full_name || "—"}</p>
                      <p className="text-xs text-ink-500">{p.guest?.phone || "No phone provided"}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-300">
                      <p>{p.booking?.room?.room_number ?? "—"}</p>
                      <p className="text-xs text-ink-500">{p.booking?.room?.hotel?.name ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-ink-900 dark:text-ink-100">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3 capitalize text-ink-600 dark:text-ink-300">{p.method}</td>
                    <td className="px-4 py-3 text-xs text-ink-500 font-mono">{p.transaction_id || "—"}</td>
                    <td className="px-4 py-3 text-xs text-ink-500">{p.created_at ? formatDateTime(p.created_at) : "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {p.status === "paid" && (
                        <button onClick={() => refundPayment(p.id)} disabled={working === p.id} className="btn-secondary px-2.5 py-1.5 text-xs">
                          {working === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RefreshCw className="h-3 w-3" /> Refund</>}
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
