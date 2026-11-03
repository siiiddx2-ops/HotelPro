import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { API_URL, AuthContext } from '../context/AuthContext';
import { formatDate, normalizeDateInput, toDateInputValue, addDaysToDateInput } from '../dateUtils';
import { calculateStayPricing } from '../pricing';

const money = amount => `₹${Number(amount || 0).toLocaleString('en-IN')}`;
const statusClass = status => status === 'Confirmed' ? 'status-pill status-pill--success' : status === 'Cancelled' ? 'status-pill status-pill--muted' : 'status-pill status-pill--neutral';
const startDateOf = value => normalizeDateInput(String(value || '').slice(0, 10)) || toDateInputValue(new Date());

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise(resolve => {
    const script = document.querySelector('[data-razorpay-checkout]') || document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => resolve(true);
    script.onerror = () => {
      script.remove();
      resolve(false);
    };
    if (!script.parentNode) document.body.appendChild(script);
  });
}

export default function GuestDashboard() {
  const { user, updateUser } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [paymentConfig, setPaymentConfig] = useState({ onlineEnabled: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState('upcoming');
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatus, setBookingStatus] = useState('all');
  const [requestView, setRequestView] = useState('open');
  const [requestSearch, setRequestSearch] = useState('');
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [profileOpen, setProfileOpen] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [editDates, setEditDates] = useState({ checkInDate: '', checkOutDate: '', guestsCount: 1 });
  const [serviceBooking, setServiceBooking] = useState(null);
  const [serviceForm, setServiceForm] = useState({ category: 'Housekeeping', details: '', priority: 'Normal' });
  const [busy, setBusy] = useState('');
  const location = useLocation();

  const fetchData = async () => {
    setError('');
    try {
      const [bookingResponse, serviceResponse] = await Promise.all([
        axios.get(`${API_URL}/bookings/my-bookings`),
        axios.get(`${API_URL}/services/mine`).catch(() => ({ data: [] }))
      ]);
      setBookings(bookingResponse.data);
      setServiceRequests(serviceResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load your trips. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setNotice(location.state?.notice || '');
    setProfile({ name: user?.name || '', phone: user?.phone || '' });
    axios.get(`${API_URL}/payments/config`).then(response => setPaymentConfig(response.data)).catch(() => setPaymentConfig({ onlineEnabled: false }));
  }, []);

  const upcoming = bookings.filter(booking => booking.bookingStatus !== 'Cancelled' && new Date(booking.checkOutDate) >= new Date(new Date().setHours(0, 0, 0, 0)));
  const past = bookings.filter(booking => booking.bookingStatus === 'Cancelled' || new Date(booking.checkOutDate) < new Date(new Date().setHours(0, 0, 0, 0)));
  const shownBookings = (view === 'upcoming' ? upcoming : past).filter(booking => {
    const query = bookingSearch.trim().toLowerCase();
    const matchesQuery = !query || [booking.room?.title, booking.room?.city, booking.room?.country, booking.room?.roomNumber, booking._id?.slice(-8)]
      .some(value => String(value || '').toLowerCase().includes(query));
    return matchesQuery && (bookingStatus === 'all' || booking.bookingStatus === bookingStatus);
  });
  const visibleRequests = serviceRequests.filter(request => {
    const isOpen = !['Completed', 'Cancelled'].includes(request.status);
    const query = requestSearch.trim().toLowerCase();
    const matchesQuery = !query || [request.category, request.details, request.room?.title, request.room?.roomNumber]
      .some(value => String(value || '').toLowerCase().includes(query));
    return (requestView === 'all' || isOpen) && matchesQuery;
  });
  const totalSpent = bookings.reduce((total, booking) => total + (booking.paymentStatus === 'Paid' ? Number(booking.totalAmount || 0) : 0), 0);
  const nightsStayed = bookings.reduce((total, booking) => {
    if (booking.bookingStatus !== 'Checked-Out') return total;
    const nights = (new Date(booking.checkOutDate) - new Date(booking.checkInDate)) / 86400000;
    return total + (Number.isFinite(nights) && nights > 0 ? Math.round(nights) : 0);
  }, 0);

  const handleCancel = async booking => {
    if (!window.confirm(`Cancel your stay at ${booking.room?.title || 'this hotel'}?`)) return;
    setBusy(booking._id); setError(''); setNotice('');
    try {
      await axios.put(`${API_URL}/bookings/${booking._id}/cancel`);
      setNotice(booking.paymentStatus === 'Paid' ? 'Reservation cancelled. Your refund request has been sent to the hotel team.' : 'Your reservation has been cancelled.');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'We could not cancel this reservation.');
    } finally { setBusy(''); }
  };

  const beginEdit = booking => {
    setEditBooking(booking._id);
    setEditDates({ checkInDate: startDateOf(booking.checkInDate), checkOutDate: startDateOf(booking.checkOutDate), guestsCount: booking.guestsCount || 1 });
  };

  const saveBookingChanges = async event => {
    event.preventDefault(); setBusy(editBooking); setError('');
    try {
      await axios.put(`${API_URL}/bookings/${editBooking}`, editDates);
      setNotice('Your reservation dates were updated and the total was recalculated.');
      setEditBooking(null);
      await fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Unable to change this reservation.'); }
    finally { setBusy(''); }
  };

  const saveProfile = async event => {
    event.preventDefault(); setBusy('profile'); setError('');
    try {
      const response = await axios.put(`${API_URL}/auth/me`, profile);
      updateUser({ name: response.data.name, phone: response.data.phone });
      setNotice('Your guest profile has been updated.'); setProfileOpen(false);
    } catch (err) { setError(err.response?.data?.message || 'Unable to update your profile.'); }
    finally { setBusy(''); }
  };

  const submitServiceRequest = async event => {
    event.preventDefault(); setBusy(serviceBooking); setError('');
    try {
      await axios.post(`${API_URL}/services`, { bookingId: serviceBooking, ...serviceForm });
      setNotice('Your request was sent to the hotel team.'); setServiceBooking(null); setServiceForm({ category: 'Housekeeping', details: '', priority: 'Normal' });
      await fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Unable to send the service request.'); }
    finally { setBusy(''); }
  };

  const choosePaymentMethod = async (booking, method) => {
    if (method === 'razorpay' && Number(booking.totalAmount) < 1) {
      setError('Online payment starts at ₹1.00. Please contact the hotel to correct this reservation total.');
      return;
    }
    if (method === 'razorpay' && !paymentConfig.onlineEnabled) return;
    setBusy(booking._id); setError(''); setNotice('');
    try {
      const response = await axios.put(`${API_URL}/bookings/${booking._id}/payment-method`, { method });
      const updatedBooking = response.data.booking;
      setBookings(current => current.map(item => item._id === booking._id ? { ...item, paymentMethod: updatedBooking.paymentMethod } : item));
      setNotice(method === 'cash' ? 'Cash at hotel selected. Pay this reservation total at check-in.' : 'Online payment selected. Continue to secure checkout below.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update your payment method.');
    } finally { setBusy(''); }
  };

  const payOnline = async booking => {
    setBusy(booking._id); setError(''); setNotice('');
    try {
      const scriptReady = await loadRazorpay();
      if (!scriptReady) throw new Error('Secure checkout could not be loaded. Check your internet connection.');
      const response = await axios.post(`${API_URL}/payments/order`, { bookingId: booking._id });
      const order = response.data;
      const checkout = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.orderId,
        name: 'HotelPro', description: `Stay at ${booking.room?.title || 'HotelPro'}`,
        prefill: { name: order.guestName, email: order.guestEmail, contact: order.guestPhone },
        theme: { color: '#183a31' },
        handler: async result => {
          try {
            await axios.post(`${API_URL}/payments/verify`, result);
            setNotice('Payment received and verified.');
            await fetchData();
          } catch (err) { setError(err.response?.data?.message || 'Payment verification is pending. Contact the hotel team before paying again.'); }
          setBusy('');
        },
        modal: { ondismiss: () => setBusy('') }
      });
      checkout.on('payment.failed', result => { setError(result.error?.description || 'Payment did not complete. You can retry or pay at the property.'); setBusy(''); });
      checkout.open();
    } catch (err) { setError(err.response?.data?.message || err.message || 'Unable to start payment.'); setBusy(''); }
  };

  return (
    <section className="dashboard-page container">
      <header className="dashboard-heading"><div><span className="eyebrow">YOUR HOTELPRO ACCOUNT</span><h1>Your stays, <em>in one place.</em></h1><p>Reservations, service updates and every trip detail, all together.</p></div><div className="guest-heading-actions"><a className="button button--outline" href="#reservations"><i className="fa-regular fa-calendar-check" /> My bookings</a><a className="button button--outline" href="#services"><i className="fa-solid fa-bell-concierge" /> Service requests</a><button className="button button--outline" type="button" onClick={() => setProfileOpen(value => !value)}><i className="fa-regular fa-user" /> {profileOpen ? 'Close profile' : 'Guest profile'}</button><Link className="button button--dark" to="/#stays">Find a new stay <i className="fa-solid fa-arrow-right" /></Link></div></header>
      {notice && <div className="inline-message inline-message--success" role="status"><i className="fa-solid fa-circle-check" />{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
      {error && <div className="inline-message inline-message--error" role="alert">{error}<button type="button" onClick={fetchData}>Try again</button></div>}
      {profileOpen && <form className="profile-form" onSubmit={saveProfile}><div><span className="eyebrow">YOUR DETAILS</span><h2>Guest profile</h2></div><label className="form-field"><span>Full name</span><input value={profile.name} onChange={event => setProfile({ ...profile, name: event.target.value })} minLength={2} maxLength={80} required /></label><label className="form-field"><span>Email address</span><input value={user?.email || ''} readOnly /></label><label className="form-field"><span>Phone</span><input type="tel" value={profile.phone} onChange={event => setProfile({ ...profile, phone: event.target.value })} maxLength={30} /></label><button className="button button--dark" type="submit" disabled={busy === 'profile'}>{busy === 'profile' ? 'Saving…' : 'Save profile'}</button></form>}
      <div className="dashboard-summary dashboard-summary--guest"><div><span className="eyebrow">TOTAL BOOKINGS</span><strong>{bookings.length.toString().padStart(2, '0')}</strong><small>all your HotelPro stays</small></div><div><span className="eyebrow">UPCOMING STAYS</span><strong>{upcoming.length.toString().padStart(2, '0')}</strong><small>on your calendar</small></div><div><span className="eyebrow">TOTAL PAID</span><strong>{money(totalSpent)}</strong><small>successfully paid bookings</small></div><div><span className="eyebrow">NIGHTS STAYED</span><strong>{nightsStayed.toString().padStart(2, '0')}</strong><small>completed nights away</small></div></div>

      <div className="dashboard-list-head" id="reservations"><div><span className="eyebrow">YOUR ITINERARY</span><h2>Reservations</h2></div><div className="segmented-control"><button className={view === 'upcoming' ? 'is-active' : ''} type="button" onClick={() => { setView('upcoming'); setBookingStatus('all'); }}>Upcoming <span>{upcoming.length}</span></button><button className={view === 'past' ? 'is-active' : ''} type="button" onClick={() => { setView('past'); setBookingStatus('all'); }}>Past stays <span>{past.length}</span></button></div></div>
      <div className="booking-filters"><label className="booking-filter-search"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><input type="search" value={bookingSearch} onChange={event => setBookingSearch(event.target.value)} placeholder="Search by stay, city, room or reference…" aria-label="Search reservations" /></label><label className="booking-filter-status"><span className="sr-only">Filter by booking status</span><select value={bookingStatus} onChange={event => setBookingStatus(event.target.value)} aria-label="Filter by booking status"><option value="all">All statuses</option><option value="Confirmed">Confirmed</option><option value="Checked-In">Checked in</option><option value="Checked-Out">Checked out</option><option value="Cancelled">Cancelled</option></select></label></div>
      {loading ? <div className="loading-state"><span className="loader" />Loading your itinerary…</div> : shownBookings.length ? <div className="booking-list">{shownBookings.map(booking => {
        const requests = serviceRequests.filter(request => String(request.booking) === String(booking._id));
        const canEdit = booking.bookingStatus === 'Confirmed' && new Date(booking.checkInDate) > new Date();
        const canRequestService = ['Confirmed', 'Checked-In'].includes(booking.bookingStatus);
        return <article className="guest-booking guest-booking--expanded" key={booking._id}>
          <img src={booking.room?.images?.[0] || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=85'} alt={booking.room?.title || 'Hotel room'} loading="lazy" />
          <div className="guest-booking__content"><div className="guest-booking__top"><span className="eyebrow">{booking.room?.category || 'HOTELPRO STAY'} · ROOM {booking.room?.roomNumber || '—'}</span><span className={statusClass(booking.bookingStatus)}>{booking.bookingStatus}</span></div><h3>{booking.room?.title || 'HotelPro stay'}</h3><span className="guest-booking__location"><i className="fa-solid fa-location-dot" /> {[booking.room?.city, booking.room?.country].filter(Boolean).join(', ') || 'India'}</span><div className="guest-booking__dates"><span><small>CHECK IN</small><strong>{formatDate(booking.checkInDate)}</strong></span><i className="fa-solid fa-arrow-right" /><span><small>CHECK OUT</small><strong>{formatDate(booking.checkOutDate)}</strong></span><span><small>GUESTS</small><strong>{booking.guestsCount || 1}</strong></span></div>
            <div className="guest-booking__actions"><Link className="text-link" to={`/invoice/${booking._id}`}><i className="fa-solid fa-file-invoice" /> Invoice</Link>{canEdit && <button className="text-link" type="button" onClick={() => beginEdit(booking)}><i className="fa-regular fa-calendar-pen" /> Change dates</button>}{canRequestService && <button className="text-link" type="button" onClick={() => setServiceBooking(serviceBooking === booking._id ? null : booking._id)}><i className="fa-solid fa-bell-concierge" /> Request service</button>}{booking.bookingStatus === 'Checked-Out' && <Link className="text-link" to={`/room/${booking.room?._id}#reviews`}><i className="fa-regular fa-star" /> Leave a review</Link>}</div>
            {editBooking === booking._id && <form className="booking-edit-form" onSubmit={saveBookingChanges}><label className="form-field"><span>Check-in</span><input type="date" min={toDateInputValue(new Date())} value={editDates.checkInDate} onChange={event => { const value = event.target.value; setEditDates(current => ({ ...current, checkInDate: value, checkOutDate: current.checkOutDate <= value ? addDaysToDateInput(value, 1) : current.checkOutDate })); }} required /></label><label className="form-field"><span>Check-out</span><input type="date" min={addDaysToDateInput(editDates.checkInDate, 1)} value={editDates.checkOutDate} onChange={event => setEditDates({ ...editDates, checkOutDate: event.target.value })} required /></label><label className="form-field"><span>Guests</span><select value={editDates.guestsCount} onChange={event => setEditDates({ ...editDates, guestsCount: Number(event.target.value) })}>{Array.from({ length: booking.room?.capacity || 1 }, (_, index) => index + 1).map(count => <option key={count} value={count}>{count}</option>)}</select></label><button className="button button--dark button--small" type="submit" disabled={busy === booking._id}>{busy === booking._id ? 'Saving…' : 'Save changes'}</button><button className="table-link" type="button" onClick={() => setEditBooking(null)}>Keep current dates</button></form>}
            {serviceBooking === booking._id && <form className="service-request-form" onSubmit={submitServiceRequest}><label className="form-field"><span>What can we help with?</span><select value={serviceForm.category} onChange={event => setServiceForm({ ...serviceForm, category: event.target.value })}><option>Housekeeping</option><option>Room Service</option><option>Maintenance</option><option>Concierge</option><option>Other</option></select></label><label className="form-field"><span>Priority</span><select value={serviceForm.priority} onChange={event => setServiceForm({ ...serviceForm, priority: event.target.value })}><option value="Normal">Normal</option><option value="High">High · urgent</option></select></label><label className="form-field"><span>Details</span><input value={serviceForm.details} onChange={event => setServiceForm({ ...serviceForm, details: event.target.value })} maxLength={1000} placeholder="Tell the team what you need" required /></label><button className="button button--dark button--small" type="submit" disabled={busy === booking._id}>{busy === booking._id ? 'Sending…' : 'Send request'}</button></form>}
            {requests.length > 0 && <div className="service-request-list"><span className="eyebrow">YOUR SERVICE REQUESTS</span>{requests.map(request => <span key={request._id}>{request.category} · {request.status}</span>)}</div>}
          </div>
          <div className="guest-booking__price"><small>BOOKING TOTAL</small><strong>{money(booking.totalAmount)}</strong><span>Payment {booking.paymentStatus || 'Pending'}</span>{booking.refundStatus === 'Requested' && <span className="refund-note">Refund requested</span>}
            {booking.paymentStatus === 'Pending' && ['Confirmed', 'Checked-In'].includes(booking.bookingStatus) && <div className="guest-payment-picker"><small>PAYMENT METHOD</small><div className="guest-payment-picker__options">
              {paymentConfig.onlineEnabled && <button className={`guest-payment-picker__option ${booking.paymentMethod === 'razorpay' ? 'is-selected' : ''}`} type="button" aria-pressed={booking.paymentMethod === 'razorpay'} onClick={() => choosePaymentMethod(booking, 'razorpay')} disabled={busy === booking._id || Number(booking.totalAmount) < 1}><strong>Pay online</strong><span>Secure checkout</span></button>}
              <button className={`guest-payment-picker__option ${booking.paymentMethod !== 'razorpay' ? 'is-selected' : ''}`} type="button" aria-pressed={booking.paymentMethod !== 'razorpay'} onClick={() => choosePaymentMethod(booking, 'cash')} disabled={busy === booking._id}><strong>Cash at hotel</strong><span>Pay during check-in</span></button>
            </div>
              {booking.paymentMethod === 'razorpay' && paymentConfig.onlineEnabled && Number(booking.totalAmount) >= 1 ? <button className="button button--gold button--small" type="button" onClick={() => payOnline(booking)} disabled={busy === booking._id}>{busy === booking._id ? 'Opening checkout…' : `Pay securely online · ${money(booking.totalAmount)}`}</button> : <span className="payment-note"><i className="fa-solid fa-money-bill-wave" /> Cash due at hotel: {money(booking.totalAmount)}</span>}
              {paymentConfig.onlineEnabled && Number(booking.totalAmount) < 1 && <span className="payment-note payment-note--warning">Online payment minimum is ₹1.00. Contact the hotel to correct this booking total.</span>}
            </div>}
            {booking.bookingStatus === 'Confirmed' && booking.room?.freeCancellationUntilCheckIn !== false && new Date(booking.checkInDate) > new Date() && <button className="text-link text-link--danger" type="button" onClick={() => handleCancel(booking)} disabled={busy === booking._id}>Cancel reservation</button>}</div>
        </article>;
      })}</div> : bookingSearch || bookingStatus !== 'all' ? <div className="empty-state collection-empty"><span className="empty-state__icon"><i className="fa-solid fa-magnifying-glass" /></span><h3>No reservations match those filters</h3><p>Try a different stay name or clear the status filter.</p><button className="button button--outline" type="button" onClick={() => { setBookingSearch(''); setBookingStatus('all'); }}>Clear filters</button></div> : <div className="empty-state collection-empty"><span className="empty-state__icon"><i className="fa-regular fa-calendar-xmark" /></span><h3>{view === 'upcoming' ? 'No upcoming stays yet' : 'Your past stays will appear here'}</h3><p>{view === 'upcoming' ? 'When you find the right place, your reservation details will be waiting right here.' : 'Once a trip is complete, you can come back and leave a verified review.'}</p><Link className="button button--outline" to="/#stays">Explore the collection</Link></div>}

      <section className="management-section guest-service-center" id="services"><div className="dashboard-list-head"><div><span className="eyebrow">DURING YOUR STAY</span><h2>Service request tracker</h2></div><div className="service-center-controls"><div className="segmented-control"><button className={requestView === 'open' ? 'is-active' : ''} type="button" onClick={() => setRequestView('open')}>Open <span>{serviceRequests.filter(request => !['Completed', 'Cancelled'].includes(request.status)).length}</span></button><button className={requestView === 'all' ? 'is-active' : ''} type="button" onClick={() => setRequestView('all')}>All requests <span>{serviceRequests.length}</span></button></div></div></div>
        <div className="booking-filters"><label className="booking-filter-search"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><input type="search" value={requestSearch} onChange={event => setRequestSearch(event.target.value)} placeholder="Search request, category or room…" aria-label="Search service requests" /></label></div>
        {loading ? <div className="loading-state"><span className="loader" />Loading your service requests…</div> : visibleRequests.length ? <div className="guest-request-list">{visibleRequests.map(request => <article className="guest-request-card" key={request._id}><div className="guest-request-card__icon"><i className={`fa-solid ${request.category === 'Housekeeping' ? 'fa-broom' : request.category === 'Maintenance' ? 'fa-screwdriver-wrench' : 'fa-bell-concierge'}`} /></div><div className="guest-request-card__main"><div><span className="eyebrow">{request.category} · ROOM {request.room?.roomNumber || '—'}</span><span className={statusClass(request.status)}>{request.status}</span></div><h3>{request.room?.title || 'Your HotelPro stay'}</h3><p>{request.details}</p><small>Sent {request.createdAt ? new Date(request.createdAt).toLocaleString() : ''}{request.assignedTo?.name ? ` · Assigned to ${request.assignedTo.name}` : ''}</small></div></article>)}</div> : <div className="table-empty">{requestSearch ? 'No service requests match that search.' : requestView === 'open' ? 'No open requests. When you need housekeeping, room service or help, start a request from the related booking above.' : 'No service requests yet. Requests you send during a stay will appear here.'}</div>}
      </section>
    </section>
  );
}
