import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchRoomById, isRoomAvailable, createNotification } from "../../lib/data";
import { supabase, type Review } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/Toast";
import { formatCurrency, nightsBetween, todayISO, addDays, formatDate } from "../../lib/utils";
import { Spinner, StatusBadge, EmptyState } from "../../components/ui";
import {
  ArrowLeft, Users, BedDouble, MapPin, Star, Wifi, Coffee, Dumbbell, Bath, Check,
  CalendarCheck, CreditCard, Loader2,
} from "lucide-react";

export default function RoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { push } = useToast();
  const { session } = useAuth();
  const [room, setRoom] = useState<Awaited<ReturnType<typeof fetchRoomById>>>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(addDays(todayISO(), 2));
  const [guests, setGuests] = useState(2);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet" | "bank_transfer">("card");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    (async () => {
      try {
        const r = await fetchRoomById(roomId);
        setRoom(r);
        const { data: revs } = await supabase
          .from("reviews")
          .select("*, guest:profiles!reviews_guest_id_fkey(full_name)")
          .eq("room_id", roomId)
          .order("created_at", { ascending: false });
        setReviews((revs ?? []) as Review[] & any);
      } catch (e) {
        push((e as Error).message, "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId, push]);

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const total = nights * (room?.price ?? 0);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!room || !session) return;
    if (nights <= 0) {
      push("Check-out must be after check-in.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const avail = await isRoomAvailable(room.id, checkIn, checkOut);
      if (!avail) {
        push("This room is already booked for those dates.", "error");
        setSubmitting(false);
        return;
      }
      const { data: booking, error: bErr } = await supabase
        .from("bookings")
        .insert({
          guest_id: session.user.id,
          hotel_id: room.hotel_id,
          room_id: room.id,
          check_in: checkIn,
          check_out: checkOut,
          guests,
          status: "pending",
          total_amount: total,
        })
        .select()
        .single();
      if (bErr) throw bErr;

      const { error: pErr } = await supabase
        .from("payments")
        .insert({
          booking_id: booking.id,
          guest_id: session.user.id,
          amount: total,
          method: paymentMethod,
          status: "paid",
          transaction_id: `TXN-${Date.now()}`,
        });
      if (pErr) throw pErr;

      await supabase.from("bookings").update({ status: "confirmed" }).eq("id", booking.id);
      await supabase.from("rooms").update({ status: "reserved" }).eq("id", room.id);

      await createNotification(
        session.user.id,
        "Booking confirmed",
        `Your booking for ${room.category?.name} (Room ${room.room_number}) from ${formatDate(checkIn)} to ${formatDate(checkOut)} is confirmed.`,
        "booking"
      );

      push("Booking confirmed! Redirecting...", "success");
      navigate(`/guest/bookings/${booking.id}`);
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary-600" /></div>;
  if (!room) return (
    <EmptyState title="Room not found" action={<Link to="/guest/rooms" className="btn-primary">Back to rooms</Link>} />
  );

  const img = room.image_url || room.hotel?.image_url ||
    "https://images.pexels.com/photos/2725675/pexels-photo-2725675.jpeg?auto=compress&cs=tinysrgb&h=650&w=940";

  return (
    <div className="space-y-6">
      <Link to="/guest/rooms" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Back to rooms
      </Link>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left: details */}
        <div className="lg:col-span-3 space-y-6">
          <div className="card overflow-hidden">
            <img src={img} alt={room.category?.name} className="h-80 w-full object-cover" />
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-display text-2xl font-semibold text-ink-900">{room.category?.name}</h1>
                  <p className="mt-1 text-ink-500">Room {room.room_number} · Floor {room.floor}</p>
                </div>
                <StatusBadge status={room.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-ink-600">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {room.hotel?.name}, {room.hotel?.city}</span>
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Up to {room.category?.capacity} guests</span>
                <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4" /> 1 large bed</span>
              </div>
              {room.category?.description && (
                <p className="mt-4 text-ink-700 leading-relaxed">{room.category.description}</p>
              )}
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-ink-800 mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {(room.category?.amenities ?? []).map((a) => (
                    <span key={a} className="badge bg-primary-50 text-primary-700 capitalize">{a}</span>
                  ))}
                  {(!room.category?.amenities || room.category.amenities.length === 0) && (
                    <span className="text-sm text-ink-400">Standard amenities included</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Reviews */}
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink-900">Guest Reviews</h2>
            {reviews.length === 0 ? (
              <p className="mt-4 text-sm text-ink-500">No reviews yet. Be the first to review after your stay!</p>
            ) : (
              <div className="mt-4 space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-ink-100 pb-4 last:border-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-ink-800">{(r as any).guest?.full_name || "Guest"}</p>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-accent-400 text-accent-400" : "text-ink-300"}`} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="mt-2 text-sm text-ink-600">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: booking form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleBook} className="card p-6 sticky top-24 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-2xl font-semibold text-primary-700">{formatCurrency(room.price)}</p>
                <p className="text-xs text-ink-500">per night</p>
              </div>
              <span className="badge bg-green-100 text-green-700"><Check className="h-3 w-3" /> Free cancellation</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Check-in</label>
                <input type="date" min={todayISO()} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Check-out</label>
                <input type="date" min={addDays(checkIn, 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Guests</label>
              <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="input">
                {Array.from({ length: room.category?.capacity ?? 4 }).map((_, i) => (
                  <option key={i} value={i + 1}>{i + 1} {i === 0 ? "guest" : "guests"}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Payment method</label>
              <div className="grid grid-cols-3 gap-2">
                {([["card", "Card"], ["wallet", "Wallet"], ["bank_transfer", "Bank"]] as const).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setPaymentMethod(v)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                      paymentMethod === v ? "border-primary-500 bg-primary-50 text-primary-700" : "border-ink-200 text-ink-600 hover:border-ink-300"
                    }`}>{l}</button>
                ))}
              </div>
            </div>

            <div className="border-t border-ink-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-ink-600">
                <span>{formatCurrency(room.price)} × {nights} nights</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Taxes & fees</span>
                <span>Included</span>
              </div>
              <div className="flex justify-between font-semibold text-ink-900 pt-2 border-t border-ink-100">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <button type="submit" disabled={submitting || room.status === "occupied" || room.status === "maintenance"} className="btn-primary w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>
                <CalendarCheck className="h-4 w-4" /> Book & Pay
              </>}
            </button>
            {room.status === "occupied" && <p className="text-xs text-red-600 text-center">This room is currently occupied.</p>}
            {room.status === "maintenance" && <p className="text-xs text-red-600 text-center">This room is under maintenance.</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
