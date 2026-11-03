import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API_URL } from '../context/AuthContext';
import { addDaysToDateInput, normalizeDateInput, toDateInputValue, formatDate } from '../dateUtils';
import { calculateStayPricing } from '../pricing';

const money = amount => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

export default function RoomDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useContext(AuthContext);
  const [room, setRoom] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [eligibleToReview, setEligibleToReview] = useState(false);
  const [checkIn, setCheckIn] = useState(normalizeDateInput(searchParams.get('checkIn')) || toDateInputValue(new Date()));
  const [checkOut, setCheckOut] = useState(normalizeDateInput(searchParams.get('checkOut')) || addDaysToDateInput(toDateInputValue(new Date()), 1));
  const [guestsCount, setGuestsCount] = useState(Math.max(1, Number(searchParams.get('guestsCount')) || 1));
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [bookingMsg, setBookingMsg] = useState('');
  const [reviewMsg, setReviewMsg] = useState('');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);

  const loadRoom = async () => {
    setRoom(null);
    setLoadError('');
    try {
      const response = await axios.get(`${API_URL}/rooms/${id}`);
      setRoom(response.data.room);
      setReviews(response.data.reviews || []);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Unable to load this stay.');
    }
  };

  useEffect(() => { loadRoom(); }, [id]);
  useEffect(() => {
    const selectedIn = normalizeDateInput(searchParams.get('checkIn'));
    const selectedOut = normalizeDateInput(searchParams.get('checkOut'));
    setCheckIn(selectedIn || toDateInputValue(new Date()));
    setCheckOut(selectedOut || addDaysToDateInput(selectedIn || toDateInputValue(new Date()), 1));
    setGuestsCount(Math.max(1, Number(searchParams.get('guestsCount')) || 1));
  }, [id, searchParams.toString()]);

  useEffect(() => {
    if (!user || !room?._id) { setEligibleToReview(false); return; }
    axios.get(`${API_URL}/bookings/my-bookings`).then(response => {
      setEligibleToReview(response.data.some(booking => String(booking.room?._id || booking.room) === String(room._id) && booking.bookingStatus === 'Checked-Out'));
    }).catch(() => setEligibleToReview(false));
  }, [user, room?._id]);

  const stayPricing = useMemo(() => calculateStayPricing(room, checkIn, checkOut), [room, checkIn, checkOut]);
  const nights = stayPricing.nights;
  const total = stayPricing.total;
  const today = toDateInputValue(new Date());
  const images = room?.images?.length ? room.images : ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=85'];
  const average = reviews.length ? (reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length) : 0;

  const handleBooking = async event => {
    event.preventDefault();
    setBookingMsg('');
    if (!user) return navigate('/login', { state: { from: location } });
    if (nights < 1) return setBookingMsg('Select a check-out date after check-in.');
    if (guestsCount > room.capacity) return setBookingMsg(`This room accommodates up to ${room.capacity} guests.`);
    setBusy(true);
    try {
      await axios.post(`${API_URL}/bookings`, { roomId: room._id, checkInDate: checkIn, checkOutDate: checkOut, guestsCount });
      navigate('/guest-dashboard', { state: { notice: 'Your stay is confirmed. You can find all the details below.' } });
    } catch (err) {
      setBookingMsg(err.response?.data?.message || 'Booking could not be completed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleReviewSubmit = async event => {
    event.preventDefault();
    setReviewBusy(true);
    setReviewMsg('');
    try {
      await axios.post(`${API_URL}/rooms/${id}/reviews`, { rating, comment: comment.trim() });
      setComment('');
      setReviewMsg('Thank you. Your review has been posted.');
      await loadRoom();
    } catch (err) {
      setReviewMsg(err.response?.data?.message || 'We could not post your review.');
    } finally {
      setReviewBusy(false);
    }
  };

  if (!room) return <div className="container page-message"><span className="eyebrow">HOTELPRO COLLECTION</span><h1>{loadError ? 'This stay is unavailable' : 'Finding the details…'}</h1><p>{loadError || 'A moment while we prepare your stay.'}</p>{loadError && <Link className="button button--dark" to="/">Explore all stays</Link>}</div>;

  return (
    <div className="detail-page container">
      <div className="breadcrumbs"><Link to="/">The collection</Link><i className="fa-solid fa-angle-right" /><span>{room.city || 'India'}</span><i className="fa-solid fa-angle-right" /><strong>{room.title}</strong></div>
      <header className="detail-heading"><div><span className="eyebrow">{room.category} · HOTELPRO STAY</span><h1>{room.title}</h1><p><i className="fa-solid fa-location-dot" /> {[room.city, room.country].filter(Boolean).join(', ') || 'India'} <span className="detail-heading__dot">·</span> Up to {room.capacity} guests</p></div><div className="detail-rating">{reviews.length ? <><strong>{(average * 2).toFixed(1)}</strong><span>{average >= 4.5 ? 'Exceptional' : 'Guest rated'}<small>{reviews.length} verified {reviews.length === 1 ? 'review' : 'reviews'}</small></span></> : <span className="rating-new">A new HotelPro favourite</span>}</div></header>

      <div className={`detail-gallery ${images.length > 1 ? '' : 'detail-gallery--single'}`}>
        <img className="detail-gallery__main" src={images[0]} alt={`${room.title}, main view`} />
        {images.length > 1 && <div className="detail-gallery__side">{images.slice(1, 3).map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${room.title}, view ${index + 2}`} loading="lazy" />)}</div>}
        <span className="detail-gallery__tag"><i className="fa-regular fa-images" /> {images.length} {images.length === 1 ? 'photo' : 'photos'}</span>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <section className="detail-block detail-intro"><span className="eyebrow">A ROOM TO CALL YOURS</span><h2>Settle into the good part.</h2><p>{room.description}</p><div className="detail-highlights"><span><i className="fa-solid fa-user-group" /><strong>{room.capacity}</strong> guests</span><span><i className="fa-solid fa-wifi" /><strong>Stay connected</strong></span><span><i className="fa-solid fa-sparkles" /><strong>{room.category} comfort</strong></span></div></section>

          <section className="detail-block"><div className="detail-section-heading"><div><span className="eyebrow">THOUGHTFUL DETAILS</span><h2>Everything you need</h2></div></div><div className="amenity-grid">{(room.amenities || []).map((amenity, index) => <span key={`${amenity}-${index}`}><i className="fa-solid fa-check" />{amenity}</span>)}</div></section>

          <section className="detail-block reviews-section" id="reviews"><div className="detail-section-heading"><div><span className="eyebrow">REAL STAYS, REAL WORDS</span><h2>Guest notes <small>({reviews.length})</small></h2></div>{reviews.length > 0 && <div className="reviews-score"><strong>{(average * 2).toFixed(1)}</strong><span>out of 10</span></div>}</div>
            {reviews.length ? <div className="review-list">{reviews.map(review => <article className="review-item" key={review._id}><div className="review-item__avatar">{review.user?.name?.charAt(0)?.toUpperCase() || 'G'}</div><div><div className="review-item__top"><strong>{review.user?.name || 'HotelPro guest'}</strong><span>{'★'.repeat(Number(review.rating))}<small> · {formatDate(review.createdAt)}</small></span></div><p>{review.comment}</p></div></article>)}</div> : <p className="muted-copy">No guest notes yet. Be the first to share how your stay felt.</p>}
            {user && eligibleToReview && <form className="review-form" onSubmit={handleReviewSubmit}><h3>Share a note from your stay</h3><div className="review-form__fields"><label className="form-field"><span>Your rating</span><select value={rating} onChange={event => setRating(Number(event.target.value))}><option value="5">5 · Exceptional</option><option value="4">4 · Very good</option><option value="3">3 · Good</option><option value="2">2 · Fair</option><option value="1">1 · Could be better</option></select></label><label className="form-field"><span>Your note</span><textarea value={comment} onChange={event => setComment(event.target.value)} maxLength={2000} rows={3} placeholder="What made your stay memorable?" required /></label></div>{reviewMsg && <p className="inline-message" role="status">{reviewMsg}</p>}<button className="button button--outline" type="submit" disabled={reviewBusy}>{reviewBusy ? 'Posting…' : 'Post your review'}</button></form>}
          </section>
        </div>

        <aside className="booking-card"><span className="eyebrow">YOUR GETAWAY</span><div className="booking-card__price"><strong>{money(room.pricePerNight)}</strong><span>per night</span></div><p className="booking-card__policy"><i className={`fa-solid ${room.freeCancellationUntilCheckIn === false ? 'fa-circle-info' : 'fa-circle-check'}`} />{room.freeCancellationUntilCheckIn === false ? 'This stay has a non-refundable rate.' : 'Free cancellation before check-in'}</p>
          {bookingMsg && <div className="form-error" role="alert">{bookingMsg}</div>}
          <form className="booking-form" onSubmit={handleBooking}><label className="form-field"><span>Check-in</span><input type="date" min={today} value={checkIn} onChange={event => { const value = event.target.value; setCheckIn(value); if (checkOut <= value) setCheckOut(addDaysToDateInput(value, 1)); }} required /></label><label className="form-field"><span>Check-out</span><input type="date" min={addDaysToDateInput(checkIn, 1)} value={checkOut} onChange={event => setCheckOut(event.target.value)} required /></label><label className="form-field"><span>Guests</span><select value={guestsCount} onChange={event => setGuestsCount(Number(event.target.value))}>{Array.from({ length: room.capacity }, (_, index) => index + 1).map(count => <option value={count} key={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>)}</select></label>
            {nights > 0 && <div className="booking-summary"><span>{money(Math.round(stayPricing.averageNightlyRate))} avg. × {nights} {nights === 1 ? 'night' : 'nights'}</span><strong>{money(total)}</strong></div>}
            <button className="button button--dark button--full" type="submit" disabled={busy || room.status === 'Maintenance' || room.status === 'Cleaning'}>{busy ? 'Reserving…' : user ? 'Reserve this stay' : 'Sign in to reserve'} <i className="fa-solid fa-arrow-right" /></button>
            <span className="booking-form__hint"><i className="fa-solid fa-lock" /> You will not be charged now</span>
          </form>
        </aside>
      </div>
      <div className="detail-back"><Link to="/" className="text-link"><i className="fa-solid fa-arrow-left" /> Back to the collection</Link></div>
    </div>
  );
}
