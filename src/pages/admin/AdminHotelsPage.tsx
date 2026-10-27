import { useEffect, useState } from "react";
import { supabase, type Hotel } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import { Spinner, EmptyState } from "../../components/ui";
import { formatDateTime } from "../../lib/utils";
import { Building2, Plus, Loader2, Edit, Trash2, X, Star } from "lucide-react";

export default function AdminHotelsPage() {
  const { push } = useToast();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Hotel | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", address: "", city: "", country: "",
    phone: "", email: "", star_rating: 4, image_url: "",
  });

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("hotels").select("*").order("name");
      if (error) throw error;
      setHotels(data ?? []);
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [push]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", description: "", address: "", city: "", country: "", phone: "", email: "", star_rating: 4, image_url: "" });
    setShowForm(true);
  }

  function openEdit(h: Hotel) {
    setEditing(h);
    setForm({
      name: h.name, description: h.description ?? "", address: h.address ?? "", city: h.city ?? "",
      country: h.country ?? "", phone: h.phone ?? "", email: h.email ?? "",
      star_rating: h.star_rating ?? 4, image_url: h.image_url ?? "",
    });
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("hotels").update(form).eq("id", editing.id);
        if (error) throw error;
        push("Hotel updated.", "success");
      } else {
        const { error } = await supabase.from("hotels").insert(form);
        if (error) throw error;
        push("Hotel created.", "success");
      }
      setShowForm(false);
      load();
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this hotel and all its rooms? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("hotels").delete().eq("id", id);
      if (error) throw error;
      push("Hotel deleted.", "success");
      load();
    } catch (e) {
      push((e as Error).message, "error");
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Hotels</h1>
          <p className="mt-1 text-ink-500">Manage your hotel properties.</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus className="h-4 w-4" /> Add hotel</button>
      </div>

      {hotels.length === 0 ? (
        <EmptyState icon={<Building2 className="h-12 w-12" />} title="No hotels yet"
          description="Add your first property to get started."
          action={<button onClick={openNew} className="btn-primary"><Plus className="h-4 w-4" /> Add hotel</button>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {hotels.map((h) => (
            <div key={h.id} className="card overflow-hidden">
              <div className="h-40 bg-ink-100 overflow-hidden">
                {h.image_url ? (
                  <img src={h.image_url} alt={h.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-ink-300"><Building2 className="h-12 w-12" /></div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink-900">{h.name}</h3>
                    <p className="text-sm text-ink-500">{h.city}{h.city && h.country ? ", " : ""}{h.country}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: h.star_rating ?? 0 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-accent-400 text-accent-400" />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm text-ink-600 line-clamp-2">{h.description}</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => openEdit(h)} className="btn-secondary flex-1 text-xs"><Edit className="h-3.5 w-3.5" /> Edit</button>
                  <button onClick={() => remove(h.id)} className="btn-danger text-xs"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4" onClick={() => setShowForm(false)}>
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-ink-900">{editing ? "Edit hotel" : "New hotel"}</h2>
              <button onClick={() => setShowForm(false)} className="text-ink-400 hover:text-ink-700"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></div>
                <div><label className="label">Star rating</label>
                  <select value={form.star_rating} onChange={(e) => setForm({ ...form, star_rating: Number(e.target.value) })} className="input">
                    {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} stars</option>)}
                  </select>
                </div>
              </div>
              <div><label className="label">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input" /></div>
                <div><label className="label">Country</label><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input" /></div>
              </div>
              <div><label className="label">Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></div>
                <div><label className="label">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></div>
              </div>
              <div><label className="label">Image URL</label><input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="input" /></div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
