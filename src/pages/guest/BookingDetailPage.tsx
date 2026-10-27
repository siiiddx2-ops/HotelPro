import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/Toast";
import { createNotification } from "../../lib/data";
import { formatCurrency, formatDate, nightsBetween } from "../../lib/utils";
import { Spinner, StatusBadge, EmptyState } from "../../components/ui";
import { ArrowLeft, Calendar, Users, CreditCard, Star, XCircle, Loader2, Download, MapPin } from "lucide-react";

export default function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { session } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hasReview, setHasReview] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select("*, room:rooms(*), hotel:hotels(*), payments(*), reviews(*)")
          .eq("id", bookingId)
          .maybeSingle();
        if (error) throw error;
        setBooking(data);
        setHasReview((data?.reviews ?? []).length > 0);
      } catch (e) {
        push((e as Error).message, "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId, push]);

  async function handleCancel() {
    if (!booking || !session) return;
    if (!confirm("Cancel this booking? A refund will be processed.")) return;
    setCancelling(true);
    try {
      await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
      await supabase.from("payments").update({ status: "refunded" }).eq("booking_id", booking.id);
      await supabase.from("rooms").update({ status: "available" }).eq("id", booking.room_id);
      await createNotification(
        session.user.id,
        "Booking cancelled",
        `Your booking for Room ${booking.room?.room_number} has been cancelled and refunded.`,
        "booking"
      );
      push("Booking cancelled and refunded.", "success");
      setBooking({ ...booking, status: "cancelled", payments: booking.payments?.map((p: any) => ({ ...p, status: "refunded" })) });
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setCancelling(false);
    }
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!booking || !session) return;
    setSubmittingReview(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        booking_id: booking.id,
        guest_id: session.user.id,
        hotel_id: booking.hotel_id,
        room_id: booking.room_id,
        rating,
        comment: comment.trim(),
      });
      if (error) throw error;
      push("Thanks for your review!", "success");
      setHasReview(true);
      setComment("");
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setSubmittingReview(false);
    }
  }

  function handleInvoice() {
    if (!booking) return;
    const text = `HOTELPRO - INVOICE\n====================\nBooking ID: ${booking.id}\nGuest: ${session?.user.email}\n\nHotel: ${booking.hotel?.name}\nRoom: ${booking.room?.room_number} (${booking.room?.category?.name})\nCheck-in: ${formatDate(booking.check_in)}\nCheck-out: ${formatDate(booking.check_out)}\nGuests: ${booking.guests}\nNights: ${nightsBetween(booking.check_in, booking.check_out)}\n\nTotal: ${formatCurrency(booking.total_amount)}\nPayment: ${booking.payments?.[0]?.method?.toUpperCase()} - ${booking.payments?.[0]?.status?.toUpperCase()}\nTxn: ${booking.payments?.[0]?.transaction_id}\n\nThank you for choosing HotelPro!`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `invoice-${booking.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary-600" /></div>;
  if (!booking) return (
    <EmptyState title="Booking not found" action={<Link to="/guest/bookings" className="btn-primary">Back to bookings</Link>} />
  );

  const nights = nightsBetween(booking.check_in, booking.check_out);
  const canCancel = booking.status === "confirmed" || booking.status === "pending";
  const canReview = booking.status === "checked_out" && !hasReview;

  return (
    <div className="space-y-6">
      <Link to="/guest/bookings" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Back to bookings
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden">
            <img src={booking.room?.image_url || "https://images.pexels.com/photos/2725675/pexels-photo-2725675.jpeg?auto=compress&cs=tinysrgb&h=400&w=800"}
              alt="" className="h-56 w-full object-cover" />
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-display text-2xl font-semibold text-ink-900">{booking.hotel?.name}</h1>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500"><MapPin className="h-4 w-4" /> {booking.hotel?.city}, {booking.hotel?.country}</p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <InfoTile icon={<Calendar className="h-4 w-4" />} label="Check-in" value={formatDate(booking.check_in)} />
                <InfoTile icon={<Calendar className="h-4 w-4" />} label="Check-out" value={formatDate(booking.check_out)} />
                <InfoTile icon={<Users className="h-4 w-4" />} label="Guests" value={`${booking.guests}`} />
                <InfoTile icon={<Star className="h-4 w-4" />} label="Nights" value={`${nights}`} />
              </div>
              <div className="mt-5 rounded-xl bg-ink-50 p-4">
                <p className="text-sm text-ink-600">Room {booking.room?.room_number} · {booking.room?.category?.name} · Floor {booking.room?.floor}</p>
              </div>
            </div>
          </div>

          {canReview && (
            <div className="card p-6">
              <h2 className="font-display text-lg font-semibold text-ink-900">Leave a review</h2>
              <p className="mt-1 text-sm text-ink-500">Share your experience to help other travelers.</p>
              <form onSubmit={handleReview} className="mt-4 space-y-4">
                <div>
                  <label className="label">Rating</label>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button key={i} type="button" onClick={() => setRating(i + 1)}>
                        <Star className={`h-7 w-7 ${i < rating ? "fill-accent-400 text-accent-400" : "text-ink-300"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Comment</label>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
                    placeholder="Tell us about your stay..." className="input" />
                </div>
                <button type="submit" disabled={submittingReview} className="btn-primary">
                  {submittingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit review"}
                </button>
              </form>
            </div>
          )}
          {hasReview && (
            <div className="card p-6">
              <h2 className="font-display text-lg font-semibold text-ink-900">Your review</h2>
              <p className="mt-2 text-sm text-ink-600">Thank you for reviewing this stay.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink-900">Payment summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-ink-600">
                <span>{formatCurrency(booking.room?.price ?? 0)} × {nights} nights</span>
                <span>{formatCurrency(booking.total_amount)}</span>
              </div>
              <div className="flex justify-between text-ink-600"><span>Taxes</span><span>Included</span></div>
              <div className="flex justify-between font-semibold text-ink-900 pt-2 border-t border-ink-100">
                <span>Total</span><span>{formatCurrency(booking.total_amount)}</span>
              </div>
            </div>
            {booking.payments?.[0] && (
              <div className="mt-4 rounded-xl bg-ink-50 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink-600">Payment method</span>
                  <span className="font-medium text-ink-800 capitalize">{booking.payments[0].method}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-ink-600">Status</span>
                  <StatusBadge status={booking.payments[0].status} />
                </div>
                <p className="mt-2 text-xs text-ink-400">Txn: {booking.payments[0].transaction_id}</p>
              </div>
            )}
            <button onClick={handleInvoice} className="btn-secondary w-full mt-4">
              <Download className="h-4 w-4" /> Download invoice
            </button>
          </div>

          {canCancel && (
            <button onClick={handleCancel} disabled={cancelling} className="btn-danger w-full">
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4" /> Cancel booking</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-100 p-4">
      <div className="flex items-center gap-2 text-xs text-ink-500">{icon} {label}</div>
      <p className="mt-1 font-semibold text-ink-900">{value}</p>
    </div>
  );
}
