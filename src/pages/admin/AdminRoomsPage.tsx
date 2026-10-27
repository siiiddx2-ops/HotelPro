import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import { Spinner, EmptyState, StatusBadge } from "../../components/ui";
import { formatCurrency } from "../../lib/utils";
import { BedDouble, Plus, Loader2, X, CalendarRange, Trash2 } from "lucide-react";

const ROOM_IMGS = [
  "https://images.pexels.com/photos/2725675/pexels-photo-2725675.jpeg?auto=compress&cs=tinysrgb&h=400&w=600",
  "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&h=400&w=600",
  "https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg?auto=compress&cs=tinysrgb&h=400&w=600",
  "https://images.pexels.com/photos/18801080/pexels-photo-18801080.jpeg?auto=compress&cs=tinysrgb&h=400&w=600",
  "https://images.pexels.com/photos/13813465/pexels-photo-13813465.jpeg?auto=compress&cs=tinysrgb&h=400&w=600",
];

export default function AdminRoomsPage() {
  const { push } = useToast();
  const [rooms, setRooms] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCat, setShowCat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ hotel_id: "", category_id: "", room_number: "", floor: 1, price: 100, status: "available", image_url: "" });
  const [catForm, setCatForm] = useState({ hotel_id: "", name: "", description: "", base_price: 100, capacity: 2, amenities: "" });
  const [activeTab, setActiveTab] = useState<"rooms" | "seasonal">("rooms");
  const [seasonalRates, setSeasonalRates] = useState<any[]>([]);
  const [showSeasonal, setShowSeasonal] = useState(false);
  const [seasonalForm, setSeasonalForm] = useState({ category_id: "", name: "", start_date: "", end_date: "", price: 100 });

  async function load() {
    setLoading(true);
    try {
      const [r, h, c, sr] = await Promise.all([
        supabase.from("rooms").select("*, hotel:hotels(name), category:room_categories(name)").order("created_at", { ascending: false }),
        supabase.from("hotels").select("id, name").order("name"),
        supabase.from("room_categories").select("*, hotel:hotels(name)").order("name"),
        supabase.from("seasonal_rates").select("*, category:room_categories(name, hotel:hotels(name))").order("start_date", { ascending: false }),
      ]);
      setRooms(r.data ?? []);
      setHotels(h.data ?? []);
      setCategories(c.data ?? []);
      setSeasonalRates(sr.data ?? []);
      if (h.data && h.data[0]) {
        setForm((f) => ({ ...f, hotel_id: f.hotel_id || h.data[0].id }));
        setCatForm((f) => ({ ...f, hotel_id: f.hotel_id || h.data[0].id }));
      }
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [push]);

  const filteredCategories = categories.filter((c) => c.hotel_id === form.hotel_id);

  async function saveRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!form.hotel_id || !form.category_id) { push("Select hotel and category.", "error"); return; }
    setSaving(true);
    try {
      const payload = {
        hotel_id: form.hotel_id,
        category_id: form.category_id,
        room_number: form.room_number,
        floor: Number(form.floor),
        price: Number(form.price),
        status: form.status,
        image_url: form.image_url || ROOM_IMGS[Math.floor(Math.random() * ROOM_IMGS.length)],
      };
      const { error } = await supabase.from("rooms").insert(payload);
      if (error) throw error;
      push("Room added.", "success");
      setShowForm(false);
      setForm({ hotel_id: form.hotel_id, category_id: "", room_number: "", floor: 1, price: 100, status: "available", image_url: "" });
      load();
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catForm.hotel_id || !catForm.name) { push("Hotel and name required.", "error"); return; }
    setSaving(true);
    try {
      const payload = {
        hotel_id: catForm.hotel_id,
        name: catForm.name,
        description: catForm.description,
        base_price: Number(catForm.base_price),
        capacity: Number(catForm.capacity),
        amenities: catForm.amenities ? catForm.amenities.split(",").map((s) => s.trim()).filter(Boolean) : [],
      };
      const { error } = await supabase.from("room_categories").insert(payload);
      if (error) throw error;
      push("Category added.", "success");
      setShowCat(false);
      setCatForm({ ...catForm, name: "", description: "", amenities: "" });
      load();
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRoom(id: string) {
    if (!confirm("Delete this room?")) return;
    try {
      const { error } = await supabase.from("rooms").delete().eq("id", id);
      if (error) throw error;
      push("Room deleted.", "success");
      load();
    } catch (e) {
      push("Could not delete room.", "error");
    }
  }

  async function setRoomStatus(id: string, status: string) {
    try {
      const { error } = await supabase.from("rooms").update({ status }).eq("id", id);
      if (error) throw error;
      load();
    } catch (e) {
      push("Could not update room status.", "error");
    }
  }

  async function saveSeasonal(e: React.FormEvent) {
    e.preventDefault();
    if (!seasonalForm.category_id || !seasonalForm.start_date || !seasonalForm.end_date) {
      push("Fill all fields.", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("seasonal_rates").insert({
        category_id: seasonalForm.category_id,
        name: seasonalForm.name || "Seasonal rate",
        start_date: seasonalForm.start_date,
        end_date: seasonalForm.end_date,
        price: Number(seasonalForm.price),
      });
      if (error) throw error;
      push("Seasonal rate added.", "success");
      setShowSeasonal(false);
      setSeasonalForm({ category_id: "", name: "", start_date: "", end_date: "", price: 100 });
      load();
    } catch (e) {
      push("Could not add seasonal rate.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeSeasonal(id: string) {
    if (!confirm("Delete this seasonal rate?")) return;
    try {
      const { error } = await supabase.from("seasonal_rates").delete().eq("id", id);
      if (error) throw error;
      push("Seasonal rate deleted.", "success");
      load();
    } catch (e) {
      push("Could not delete rate.", "error");
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="section-title">Room Inventory</h1>
          <p className="mt-1 text-ink-500 dark:text-ink-400">Manage rooms, categories, and pricing.</p>
        </div>
        {activeTab === "rooms" ? (
          <div className="flex gap-2">
            <button onClick={() => setShowCat(true)} className="btn-secondary"><Plus className="h-4 w-4" /> Category</button>
            <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add room</button>
          </div>
        ) : (
          <button onClick={() => setShowSeasonal(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add rate</button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1.5">
        <button onClick={() => setActiveTab("rooms")} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${activeTab === "rooms" ? "bg-primary-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"}`}>Rooms</button>
        <button onClick={() => setActiveTab("seasonal")} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${activeTab === "seasonal" ? "bg-primary-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"}`}>Seasonal Pricing</button>
      </div>

      {activeTab === "seasonal" ? (
        seasonalRates.length === 0 ? (
          <EmptyState icon={<CalendarRange className="h-12 w-12" />} title="No seasonal rates yet"
            description="Set date-based price overrides for peak seasons, holidays, or promotions."
            action={<button onClick={() => setShowSeasonal(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add rate</button>} />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-ink-500 text-left dark:bg-ink-900/50 dark:text-ink-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Date range</th>
                    <th className="px-4 py-3 font-medium">Price/night</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-ink-700">
                  {seasonalRates.map((s) => (
                    <tr key={s.id} className="hover:bg-ink-50 dark:hover:bg-ink-800/50">
                      <td className="px-4 py-3 font-medium text-ink-900 dark:text-ink-100">{s.name}</td>
                      <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{s.category?.name} · {s.category?.hotel?.name}</td>
                      <td className="px-4 py-3 text-xs text-ink-600 dark:text-ink-300">{s.start_date} → {s.end_date}</td>
                      <td className="px-4 py-3 font-medium text-ink-900 dark:text-ink-100">{formatCurrency(s.price)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeSeasonal(s.id)} className="text-ink-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : hotels.length === 0 ? (
        <EmptyState icon={<BedDouble className="h-12 w-12" />} title="Add a hotel first"
          description="You need at least one hotel before adding rooms." />
      ) : rooms.length === 0 ? (
        <EmptyState icon={<BedDouble className="h-12 w-12" />} title="No rooms yet"
          description="Add rooms and categories to build your inventory." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-ink-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Room</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Hotel</th>
                  <th className="px-4 py-3 font-medium">Price/night</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-ink-50">
                    <td className="px-4 py-3 font-medium text-ink-900">Room {r.room_number} <span className="text-ink-400 text-xs">· Fl {r.floor}</span></td>
                    <td className="px-4 py-3 text-ink-600">{r.category?.name}</td>
                    <td className="px-4 py-3 text-ink-600">{r.hotel?.name}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(r.price)}</td>
                    <td className="px-4 py-3">
                      <select value={r.status} onChange={(e) => setRoomStatus(r.id, e.target.value)} className="input inline-block w-auto text-xs py-1.5">
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="cleaning">Cleaning</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="reserved">Reserved</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeRoom(r.id)} className="text-ink-400 hover:text-red-600 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Room form modal */}
      {showForm && (
        <Modal title="Add room" onClose={() => setShowForm(false)}>
          <form onSubmit={saveRoom} className="space-y-4">
            <div><label className="label">Hotel</label>
              <select value={form.hotel_id} onChange={(e) => setForm({ ...form, hotel_id: e.target.value, category_id: "" })} className="input">
                {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div><label className="label">Category</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input">
                <option value="">Select category</option>
                {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name} — {formatCurrency(c.base_price)}</option>)}
              </select>
              {filteredCategories.length === 0 && <p className="text-xs text-ink-400 mt-1">No categories for this hotel. Add one first.</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label">Room number</label><input required value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} className="input" /></div>
              <div><label className="label">Floor</label><input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })} className="input" /></div>
              <div><label className="label">Price/night</label><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="input" /></div>
            </div>
            <div><label className="label">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="cleaning">Cleaning</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div><label className="label">Image URL (optional)</label><input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="Auto-selected if blank" className="input" /></div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add room"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Category form modal */}
      {showCat && (
        <Modal title="Add room category" onClose={() => setShowCat(false)}>
          <form onSubmit={saveCategory} className="space-y-4">
            <div><label className="label">Hotel</label>
              <select value={catForm.hotel_id} onChange={(e) => setCatForm({ ...catForm, hotel_id: e.target.value })} className="input">
                {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div><label className="label">Category name</label><input required value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Deluxe Suite" className="input" /></div>
            <div><label className="label">Description</label><textarea value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} rows={2} className="input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Base price/night</label><input type="number" value={catForm.base_price} onChange={(e) => setCatForm({ ...catForm, base_price: Number(e.target.value) })} className="input" /></div>
              <div><label className="label">Capacity (guests)</label><input type="number" value={catForm.capacity} onChange={(e) => setCatForm({ ...catForm, capacity: Number(e.target.value) })} className="input" /></div>
            </div>
            <div><label className="label">Amenities (comma-separated)</label><input value={catForm.amenities} onChange={(e) => setCatForm({ ...catForm, amenities: e.target.value })} placeholder="wifi, breakfast, gym" className="input" /></div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add category"}</button>
              <button type="button" onClick={() => setShowCat(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Seasonal rate modal */}
      {showSeasonal && (
        <Modal title="Add seasonal rate" onClose={() => setShowSeasonal(false)}>
          <form onSubmit={saveSeasonal} className="space-y-4">
            <div><label className="label">Category</label>
              <select value={seasonalForm.category_id} onChange={(e) => setSeasonalForm({ ...seasonalForm, category_id: e.target.value })} className="input">
                <option value="">Select category...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.hotel?.name}</option>)}
              </select>
            </div>
            <div><label className="label">Rate name</label><input value={seasonalForm.name} onChange={(e) => setSeasonalForm({ ...seasonalForm, name: e.target.value })} placeholder="e.g. Summer Peak" className="input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Start date</label><input type="date" value={seasonalForm.start_date} onChange={(e) => setSeasonalForm({ ...seasonalForm, start_date: e.target.value })} className="input" /></div>
              <div><label className="label">End date</label><input type="date" value={seasonalForm.end_date} onChange={(e) => setSeasonalForm({ ...seasonalForm, end_date: e.target.value })} className="input" /></div>
            </div>
            <div><label className="label">Price/night</label><input type="number" value={seasonalForm.price} onChange={(e) => setSeasonalForm({ ...seasonalForm, price: Number(e.target.value) })} className="input" /></div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add rate"}</button>
              <button type="button" onClick={() => setShowSeasonal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
