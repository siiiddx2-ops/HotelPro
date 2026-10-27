import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRoomsWithCategories, fetchHotels, type RoomWithCategory } from "../../lib/data";
import { formatCurrency } from "../../lib/utils";
import { useToast } from "../../components/Toast";
import { Spinner, EmptyState, StatusBadge } from "../../components/ui";
import { BedDouble, Users, Search, MapPin, Wifi, Coffee, Dumbbell, Bath } from "lucide-react";

const amenityIcon: Record<string, React.ReactNode> = {
  wifi: <Wifi className="h-3.5 w-3.5" />,
  breakfast: <Coffee className="h-3.5 w-3.5" />,
  gym: <Dumbbell className="h-3.5 w-3.5" />,
  bath: <Bath className="h-3.5 w-3.5" />,
};

export default function RoomsPage() {
  const { push } = useToast();
  const [rooms, setRooms] = useState<RoomWithCategory[]>([]);
  const [hotels, setHotels] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hotelFilter, setHotelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("available");
  const [sort, setSort] = useState("price_asc");

  useEffect(() => {
    (async () => {
      try {
        const [r, h] = await Promise.all([fetchRoomsWithCategories(), fetchHotels()]);
        setRooms(r);
        setHotels(h.map((x) => ({ id: x.id, name: x.name })));
      } catch (e) {
        push((e as Error).message, "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [push]);

  const filtered = useMemo(() => {
    let list = rooms.slice();
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.room_number.toLowerCase().includes(s) ||
          r.category?.name?.toLowerCase().includes(s) ||
          r.hotel?.name?.toLowerCase().includes(s) ||
          r.hotel?.city?.toLowerCase().includes(s)
      );
    }
    if (hotelFilter) list = list.filter((r) => r.hotel_id === hotelFilter);
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    if (sort === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "capacity") list.sort((a, b) => (b.category?.capacity ?? 0) - (a.category?.capacity ?? 0));
    return list;
  }, [rooms, search, hotelFilter, statusFilter, sort]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Browse Rooms</h1>
        <p className="mt-1 text-ink-500">Find and book your perfect stay across our properties.</p>
      </div>

      {/* Filters */}
      <div className="card p-4 grid gap-3 md:grid-cols-5">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search room, category, or city..."
            className="input pl-9"
          />
        </div>
        <select value={hotelFilter} onChange={(e) => setHotelFilter(e.target.value)} className="input">
          <option value="">All hotels</option>
          {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
          <option value="">Any status</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
          <option value="cleaning">Cleaning</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input">
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="capacity">Capacity: High to Low</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary-600" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BedDouble className="h-12 w-12" />}
          title="No rooms found"
          description="Try adjusting your filters or search."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}

function RoomCard({ room }: { room: RoomWithCategory }) {
  const img = room.image_url || room.hotel?.image_url ||
    "https://images.pexels.com/photos/2725675/pexels-photo-2725675.jpeg?auto=compress&cs=tinysrgb&h=650&w=940";
  return (
    <Link to={`/guest/rooms/${room.id}`} className="card overflow-hidden group hover:shadow-soft hover:-translate-y-1 transition-all">
      <div className="relative h-48 overflow-hidden bg-ink-100">
        <img src={img} alt={room.category?.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-3 left-3"><StatusBadge status={room.status} /></div>
        <div className="absolute top-3 right-3 rounded-md bg-ink-950/70 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
          {formatCurrency(room.price)}/night
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink-900">{room.category?.name ?? "Room"}</h3>
            <p className="text-sm text-ink-500">Room {room.room_number} · Floor {room.floor}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
          <MapPin className="h-3.5 w-3.5" /> {room.hotel?.name} · {room.hotel?.city}
        </div>
        <p className="mt-2 text-sm text-ink-600 line-clamp-2">{room.category?.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-ink-600">
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {room.category?.capacity} guests</span>
            <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> 1 bed</span>
          </div>
          <div className="flex gap-1.5">
            {(room.category?.amenities ?? []).slice(0, 4).map((a) => (
              <span key={a} className="flex h-6 w-6 items-center justify-center rounded bg-ink-100 text-ink-600" title={a}>
                {amenityIcon[a.toLowerCase()] ?? <Coffee className="h-3.5 w-3.5" />}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
