import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API_URL, AuthContext } from '../context/AuthContext';
import { formatDate, toDateInputValue, addDaysToDateInput } from '../dateUtils';

const blankRoom = { roomNumber: '', title: '', city: 'Jaipur', country: 'India', category: 'Standard', pricePerNight: '', capacity: 2, description: '', image: '', amenities: 'Free Wi-Fi, Air Conditioning, Room Service, Smart TV', freeCancellationUntilCheckIn: true };
const blankSeason = { roomId: '', label: '', startDate: '', endDate: '', pricePerNight: '' };
const blankTeamAccount = { name: '', email: '', phone: '', password: '', role: 'staff' };
const blankStats = { totalUsers: 0, totalRooms: 0, totalBookings: 0, totalRevenue: 0, availableRooms: 0, checkedIn: 0, pendingPayments: 0, openRequests: 0, occupancyRate: 0 };
const money = amount => `₹${Number(amount || 0).toLocaleString('en-IN')}`;
const statusClass = status => status === 'Confirmed' ? 'status-pill status-pill--success' : status === 'Cancelled' ? 'status-pill status-pill--muted' : 'status-pill status-pill--neutral';
const dateKey = value => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : toDateInputValue(date);
};

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [report, setReport] = useState({ monthlyRevenue: [], bookingStatuses: [], paymentMethods: [] });
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState(blankStats);
  const [newRoom, setNewRoom] = useState(blankRoom);
  const [season, setSeason] = useState(blankSeason);
  const [teamAccount, setTeamAccount] = useState(blankTeamAccount);
  const [teamFormOpen, setTeamFormOpen] = useState(false);
  const [bookingView, setBookingView] = useState('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [serviceView, setServiceView] = useState('open');
  const [serviceSearch, setServiceSearch] = useState('');
  const [roomView, setRoomView] = useState('all');
  const [roomSearch, setRoomSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');

  const fetchData = async () => {
    setError('');
    const optional = promise => promise.catch(() => ({ data: null }));
    try {
      const [roomsRes, bookingsRes, statsRes, servicesRes, paymentsRes, reportsRes, usersRes, activityRes] = await Promise.all([
        axios.get(`${API_URL}/rooms/manage`), axios.get(`${API_URL}/bookings`), axios.get(`${API_URL}/admin/stats`),
        optional(axios.get(`${API_URL}/services`)),
        isAdmin ? optional(axios.get(`${API_URL}/payments?limit=100`)) : Promise.resolve({ data: null }),
        isAdmin ? optional(axios.get(`${API_URL}/admin/reports`)) : Promise.resolve({ data: null }),
        isAdmin ? optional(axios.get(`${API_URL}/admin/users`)) : Promise.resolve({ data: [] }),
        isAdmin ? optional(axios.get(`${API_URL}/admin/activity`)) : Promise.resolve({ data: [] })
      ]);
      setRooms(roomsRes.data); setBookings(bookingsRes.data); setStats({ ...blankStats, ...(statsRes.data || {}) });
      setRequests(servicesRes.data || []); setPayments(paymentsRes.data?.payments || []);
      setReport(reportsRes.data || { monthlyRevenue: [], bookingStatuses: [], paymentMethods: [] });
      setUsers(usersRes.data || []); setActivity(activityRes.data || []);
      if (!servicesRes.data || (isAdmin && (!paymentsRes.data || !reportsRes.data))) setError('Some operations data could not be loaded. Use Refresh to try again.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load the hotel dashboard.');
    }
  };
  useEffect(() => { fetchData(); }, [isAdmin]);

  const handleAddRoom = async event => {
    event.preventDefault(); setBusy('room'); setError('');
    try {
      await axios.post(`${API_URL}/rooms`, {
        ...newRoom, roomNumber: newRoom.roomNumber.trim(), title: newRoom.title.trim(), city: newRoom.city.trim(), country: newRoom.country.trim(),
        pricePerNight: Number(newRoom.pricePerNight), capacity: Number(newRoom.capacity), amenities: newRoom.amenities.split(',').map(value => value.trim()).filter(Boolean),
        images: [newRoom.image.trim() || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85']
      });
      setNewRoom(blankRoom); setNotice('The new stay is now part of your collection.'); await fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Could not add this room. Check the details and try again.'); }
    finally { setBusy(''); }
  };

  const addDemoRooms = async () => {
    setBusy('seed'); setError('');
    try { const response = await axios.post(`${API_URL}/rooms/seed`); setNotice(response.data.message); await fetchData(); }
    catch (err) { setError(err.response?.data?.message || 'Only an administrator can add the demo collection.'); }
    finally { setBusy(''); }
  };

  const handleDeleteRoom = async room => {
    if (!window.confirm(`Remove ${room.title} (room ${room.roomNumber}) from inventory?`)) return;
    setBusy(room._id); setError('');
    try { await axios.delete(`${API_URL}/rooms/${room._id}`); setNotice('The room was removed from inventory.'); await fetchData(); }
    catch (err) { setError(err.response?.data?.message || 'Could not remove this room.'); }
    finally { setBusy(''); }
  };

  const handleRoomStatus = async (room, status) => {
    try { await axios.put(`${API_URL}/rooms/${room._id}`, { status }); setNotice(`Room ${room.roomNumber} is now marked ${status.toLowerCase()}.`); await fetchData(); }
    catch (err) { setError(err.response?.data?.message || 'Could not update room status.'); }
  };

  const saveRoomPrice = async room => {
    const value = Number(document.getElementById(`room-price-${room._id}`)?.value);
    if (!Number.isFinite(value) || value < 1) return setError('Enter a valid nightly rate.');
    try { await axios.put(`${API_URL}/rooms/${room._id}`, { pricePerNight: value }); setNotice(`Room ${room.roomNumber} base rate updated.`); await fetchData(); }
    catch (err) { setError(err.response?.data?.message || 'Could not update the room rate.'); }
  };

  const addSeasonalRate = async event => {
    event.preventDefault(); setBusy('season'); setError('');
    try {
      await axios.post(`${API_URL}/rooms/${season.roomId}/seasonal-rates`, { ...season, pricePerNight: Number(season.pricePerNight) });
      setSeason(current => ({ ...blankSeason, roomId: current.roomId })); setNotice('Seasonal rate saved; affected bookings will use it automatically.'); await fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Unable to save seasonal pricing.'); }
    finally { setBusy(''); }
  };

  const removeSeasonalRate = async (roomId, rateId) => {
    try { await axios.delete(`${API_URL}/rooms/${roomId}/seasonal-rates/${rateId}`); setNotice('Seasonal rate removed.'); await fetchData(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to remove this rate.'); }
  };

  const updateBookingStatus = async (booking, bookingStatus) => {
    if (bookingStatus === 'Cancelled' && !window.confirm(`Cancel ${booking.user?.name || 'this guest'}’s booking?`)) return;
    setBusy(booking._id); setError('');
    try { await axios.put(`${API_URL}/bookings/${booking._id}/status`, { bookingStatus }); setNotice(`Booking updated to ${bookingStatus.toLowerCase()}.`); await fetchData(); }
    catch (err) { setError(err.response?.data?.message || 'Could not update this booking.'); }
    finally { setBusy(''); }
  };

  const recordCashPayment = async booking => {
    if (!window.confirm(`Record ₹${Number(booking.totalAmount).toLocaleString('en-IN')} received in cash for ${booking.user?.name || 'this guest'}?`)) return;
    setBusy(booking._id); setError('');
    try { await axios.post(`${API_URL}/payments/${booking._id}/cash`); setNotice('Cash payment recorded and guest notified.'); await fetchData(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to record this payment.'); }
    finally { setBusy(''); }
  };

  const processRefund = async booking => {
    if (!window.confirm(`Process the pending refund of ${money(booking.totalAmount)}? Razorpay payments will be returned through the gateway.`)) return;
    setBusy(booking._id); setError('');
    try { await axios.post(`${API_URL}/payments/${booking._id}/refund`); setNotice('Refund processed and guest notified.'); await fetchData(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to process this refund.'); }
    finally { setBusy(''); }
  };

  const updateService = async (request, patch) => {
    setBusy(request._id); setError('');
    try { await axios.put(`${API_URL}/services/${request._id}`, patch); setNotice('Service request updated.'); await fetchData(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to update service request.'); }
    finally { setBusy(''); }
  };

  const updateRole = async (account, role) => {
    setBusy(account._id); setError('');
    try { await axios.put(`${API_URL}/admin/users/${account._id}/role`, { role }); setNotice(`${account.name} is now ${role}.`); await fetchData(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to update account role.'); await fetchData(); }
    finally { setBusy(''); }
  };

  const createTeamAccount = async event => {
    event.preventDefault(); setBusy('team-account'); setError(''); setNotice('');
    try {
      const response = await axios.post(`${API_URL}/admin/users`, {
        ...teamAccount,
        name: teamAccount.name.trim(),
        email: teamAccount.email.trim(),
        phone: teamAccount.phone.trim()
      });
      setTeamAccount(blankTeamAccount);
      setTeamFormOpen(false);
      setNotice(`${response.data.role === 'admin' ? 'Administrator' : 'Staff'} account created for ${response.data.email}. Share the initial password privately so they can sign in.`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create this team account.');
    } finally { setBusy(''); }
  };

  const revenueMax = Math.max(1, ...(report.monthlyRevenue || []).map(entry => Number(entry.revenue || 0)));
  const occupiedCount = rooms.filter(room => room.status === 'Occupied').length;
  const today = toDateInputValue(new Date());
  const arrivalsToday = bookings.filter(booking => booking.bookingStatus === 'Confirmed' && dateKey(booking.checkInDate) === today).length;
  const departuresToday = bookings.filter(booking => booking.bookingStatus === 'Checked-In' && dateKey(booking.checkOutDate) === today).length;
  const inHouseCount = bookings.filter(booking => booking.bookingStatus === 'Checked-In').length;
  const openRequestCount = requests.filter(request => !['Completed', 'Cancelled'].includes(request.status)).length;
  const visibleBookings = bookings.filter(booking => {
    const inSelectedView = isAdmin || bookingView === 'all'
      || (bookingView === 'arrivals' && booking.bookingStatus === 'Confirmed' && dateKey(booking.checkInDate) === today)
      || (bookingView === 'departures' && booking.bookingStatus === 'Checked-In' && dateKey(booking.checkOutDate) === today)
      || (bookingView === 'in-house' && booking.bookingStatus === 'Checked-In');
    const query = bookingSearch.trim().toLowerCase();
    const matchesSearch = !query || [booking.user?.name, booking.user?.email, booking.room?.title, booking.room?.roomNumber, booking._id]
      .some(value => String(value || '').toLowerCase().includes(query));
    return inSelectedView && matchesSearch;
  });
  const visibleRequests = requests.filter(request => {
    const isOpen = !['Completed', 'Cancelled'].includes(request.status);
    const inSelectedView = isAdmin || serviceView === 'all' || (serviceView === 'open' && isOpen)
      || (serviceView === 'assigned' && ['Assigned', 'In Progress'].includes(request.status))
      || (serviceView === 'completed' && ['Completed', 'Cancelled'].includes(request.status));
    const query = serviceSearch.trim().toLowerCase();
    const matchesSearch = !query || [request.guest?.name, request.guest?.email, request.category, request.details, request.room?.title, request.room?.roomNumber]
      .some(value => String(value || '').toLowerCase().includes(query));
    return inSelectedView && matchesSearch;
  });
  const visibleRooms = rooms.filter(room => {
    const inSelectedView = isAdmin || roomView === 'all'
      || (roomView === 'available' && room.status === 'Available')
      || (roomView === 'occupied' && room.status === 'Occupied')
      || (roomView === 'attention' && ['Cleaning', 'Maintenance'].includes(room.status));
    const query = roomSearch.trim().toLowerCase();
    const matchesSearch = !query || [room.roomNumber, room.title, room.city, room.category]
      .some(value => String(value || '').toLowerCase().includes(query));
    return inSelectedView && matchesSearch;
  });

  return (
    <section className={`dashboard-page container hotel-dashboard ${isAdmin ? 'hotel-dashboard--admin' : 'hotel-dashboard--staff'}`}>
      <header className="dashboard-heading"><div><span className="eyebrow">{isAdmin ? 'HOTEL ADMINISTRATION' : 'FRONT DESK OPERATIONS'}</span><h1>{isAdmin ? <>The hotel, <em>at a glance.</em></> : <>Your shift, <em>in focus.</em></>}</h1><p>{isAdmin ? 'Rooms, reservations, guest services and business performance in one view.' : 'Arrivals, in-house guests, room readiness and guest requests for today.'}</p></div><div className="guest-heading-actions">{isAdmin && <a className="button button--outline" href="#team"><i className="fa-solid fa-users" /> Manage team</a>}<span className="role-badge"><i className={`fa-solid ${isAdmin ? 'fa-sliders' : 'fa-bell-concierge'}`} /> {isAdmin ? 'Administrator' : 'Staff · Front desk'}</span><button className="button button--outline" type="button" onClick={fetchData}><i className="fa-solid fa-rotate" /> Refresh</button></div></header>
      {notice && <div className="inline-message inline-message--success" role="status"><i className="fa-solid fa-circle-check" />{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
      {error && <div className="inline-message inline-message--error" role="alert">{error}<button type="button" onClick={fetchData}>Try again</button></div>}

      {isAdmin ? <>
        <div className="dashboard-summary dashboard-summary--hotel"><div><span className="eyebrow">ROOMS IN INVENTORY</span><strong>{Number(stats.totalRooms || 0).toString().padStart(2, '0')}</strong><small>{Number(stats.availableRooms || 0)} ready · {occupiedCount} occupied</small></div><div><span className="eyebrow">RESERVATIONS</span><strong>{Number(stats.totalBookings || 0).toString().padStart(2, '0')}</strong><small>{Number(stats.checkedIn || 0)} guests checked in</small></div><div><span className="eyebrow">REVENUE TO DATE</span><strong>{money(stats.totalRevenue)}</strong><small>{Number(stats.pendingPayments || 0)} bookings with payment due</small></div></div>
        <div className="dashboard-summary dashboard-summary--mini"><div><span className="eyebrow">OCCUPANCY TODAY</span><strong>{Number(stats.occupancyRate || 0)}%</strong><small>based on checked-in stays</small></div><div><span className="eyebrow">OPEN SERVICE REQUESTS</span><strong>{Number(stats.openRequests || 0).toString().padStart(2, '0')}</strong><small>waiting for the hotel team</small></div><div><span className="eyebrow">GUEST ACCOUNTS</span><strong>{Number(stats.totalUsers || 0).toString().padStart(2, '0')}</strong><small>registered with HotelPro</small></div></div>
      </> : <div className="dashboard-summary dashboard-summary--staff"><div><span className="eyebrow">ARRIVALS TODAY</span><strong>{arrivalsToday.toString().padStart(2, '0')}</strong><small>confirmed check-ins</small></div><div><span className="eyebrow">GUESTS IN HOUSE</span><strong>{inHouseCount.toString().padStart(2, '0')}</strong><small>currently checked in</small></div><div><span className="eyebrow">DEPARTURES TODAY</span><strong>{departuresToday.toString().padStart(2, '0')}</strong><small>rooms to turn over</small></div><div><span className="eyebrow">OPEN REQUESTS</span><strong>{openRequestCount.toString().padStart(2, '0')}</strong><small>guest services queue</small></div></div>}

      <section className="management-section staff-booking-section">
        <div className="dashboard-list-head"><div><span className="eyebrow">{isAdmin ? 'TODAY AND AHEAD' : 'GUEST ARRIVALS & DEPARTURES'}</span><h2>{isAdmin ? 'Booking desk' : 'Front desk bookings'}</h2></div><span className="table-count">{visibleBookings.length}{!isAdmin && bookingSearch ? ` of ${bookings.length}` : ''} reservations</span></div>
        {!isAdmin && <div className="staff-control-panel"><div className="staff-filter-tabs" role="group" aria-label="Filter front desk bookings">
          <button className={bookingView === 'all' ? 'is-active' : ''} type="button" onClick={() => setBookingView('all')}>All <span>{bookings.length}</span></button>
          <button className={bookingView === 'arrivals' ? 'is-active' : ''} type="button" onClick={() => setBookingView('arrivals')}>Arrivals <span>{arrivalsToday}</span></button>
          <button className={bookingView === 'departures' ? 'is-active' : ''} type="button" onClick={() => setBookingView('departures')}>Departures <span>{departuresToday}</span></button>
          <button className={bookingView === 'in-house' ? 'is-active' : ''} type="button" onClick={() => setBookingView('in-house')}>In house <span>{inHouseCount}</span></button>
        </div><label className="staff-control-search"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><input type="search" value={bookingSearch} onChange={event => setBookingSearch(event.target.value)} placeholder="Search guest, room or reference…" aria-label="Search front desk bookings" /></label></div>}
        <div className="management-table-wrap"><table className="management-table"><thead><tr><th>GUEST</th><th>ROOM</th><th>DATES</th>{isAdmin && <th>BOOKING TOTAL</th>}<th>STATUS</th><th>{isAdmin ? 'NEXT STEP' : 'FRONT DESK ACTION'}</th></tr></thead><tbody>{visibleBookings.map(booking => <tr key={booking._id}><td><strong>{booking.user?.name || 'Guest'}</strong><small>{booking.user?.email || ''}</small></td><td>{booking.room?.title || 'Hotel room'}<small>Room {booking.room?.roomNumber || '—'}</small></td><td>{formatDate(booking.checkInDate)}<small>to {formatDate(booking.checkOutDate)}</small></td>{isAdmin && <td>{money(booking.totalAmount)}<small>Payment {booking.paymentStatus || 'Pending'}{booking.refundStatus === 'Requested' ? ' · Refund requested' : ''}</small></td>}<td><span className={statusClass(booking.bookingStatus)}>{booking.bookingStatus}</span>{!isAdmin && booking.paymentStatus === 'Pending' && <small className="payment-note">Payment due · {money(booking.totalAmount)}</small>}</td><td className="management-actions">{booking.bookingStatus === 'Confirmed' && <><button className="button button--mini" type="button" onClick={() => updateBookingStatus(booking, 'Checked-In')}>Check in</button>{isAdmin && <button className="table-link table-link--danger" type="button" onClick={() => updateBookingStatus(booking, 'Cancelled')}>Cancel</button>}</>}{booking.bookingStatus === 'Checked-In' && <button className="button button--mini" type="button" onClick={() => updateBookingStatus(booking, 'Checked-Out')}>Check out</button>}{booking.paymentStatus === 'Pending' && booking.bookingStatus !== 'Cancelled' && <button className="table-link" type="button" onClick={() => recordCashPayment(booking)}>{isAdmin ? 'Record cash' : `Record ${money(booking.totalAmount)} cash`}</button>}{isAdmin && booking.refundStatus === 'Requested' && <button className="table-link table-link--danger" type="button" onClick={() => processRefund(booking)}>Process refund</button>}{!['Confirmed', 'Checked-In'].includes(booking.bookingStatus) && booking.paymentStatus !== 'Pending' && (!isAdmin || booking.refundStatus !== 'Requested') && <span className="table-dash">—</span>}</td></tr>)}</tbody></table>{visibleBookings.length === 0 && <div className="table-empty">{bookingSearch || (!isAdmin && bookingView !== 'all') ? 'No reservations match this filter.' : 'There are no reservations yet.'}</div>}</div>
      </section>

      <section className="management-section" id="services">
        <div className="dashboard-list-head"><div><span className="eyebrow">GUEST SUPPORT</span><h2>{isAdmin ? 'Service requests' : 'Guest service queue'}</h2></div><span className="table-count">{openRequestCount} open · {visibleRequests.length} shown</span></div>
        {!isAdmin && <div className="staff-control-panel"><div className="staff-filter-tabs" role="group" aria-label="Filter service requests">
          <button className={serviceView === 'open' ? 'is-active' : ''} type="button" onClick={() => setServiceView('open')}>Needs action <span>{openRequestCount}</span></button>
          <button className={serviceView === 'assigned' ? 'is-active' : ''} type="button" onClick={() => setServiceView('assigned')}>Assigned <span>{requests.filter(request => ['Assigned', 'In Progress'].includes(request.status)).length}</span></button>
          <button className={serviceView === 'completed' ? 'is-active' : ''} type="button" onClick={() => setServiceView('completed')}>History <span>{requests.filter(request => ['Completed', 'Cancelled'].includes(request.status)).length}</span></button>
          <button className={serviceView === 'all' ? 'is-active' : ''} type="button" onClick={() => setServiceView('all')}>All</button>
        </div><label className="staff-control-search"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><input type="search" value={serviceSearch} onChange={event => setServiceSearch(event.target.value)} placeholder="Search guest, room or request…" aria-label="Search service requests" /></label></div>}
        <div className="management-table-wrap"><table className="management-table"><thead><tr><th>GUEST</th><th>REQUEST</th>{!isAdmin && <th>PRIORITY</th>}<th>ROOM</th><th>ASSIGNED TO</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{visibleRequests.map(request => <tr key={request._id}><td><strong>{request.guest?.name || 'Guest'}</strong><small>{request.guest?.email || ''}</small></td><td><strong>{request.category}</strong><small>{request.details}</small></td>{!isAdmin && <td><span className={request.priority === 'High' ? 'request-priority request-priority--high' : 'request-priority'}>{request.priority || 'Normal'}</span></td>}<td>{request.room?.title || 'Room'}<small>Room {request.room?.roomNumber || '—'}</small></td><td>{request.assignedTo?.name || 'Unassigned'}</td><td><span className={statusClass(request.status)}>{request.status}</span></td><td className="management-actions">{!request.assignedTo && <button className="table-link" type="button" onClick={() => updateService(request, { assignedTo: 'me', status: 'Assigned' })}>Assign to me</button>}{request.status === 'Assigned' && <button className="table-link" type="button" onClick={() => updateService(request, { status: 'In Progress' })}>Start</button>}{['Assigned', 'In Progress'].includes(request.status) && <button className="table-link" type="button" onClick={() => updateService(request, { status: 'Completed' })}>Complete</button>}</td></tr>)}</tbody></table>{visibleRequests.length === 0 && <div className="table-empty">{serviceSearch ? 'No service requests match that search.' : 'No service requests in this view.'}</div>}</div>
      </section>

      <section className="inventory-section"><div className="dashboard-list-head"><div><span className="eyebrow">{isAdmin ? 'ROOM INVENTORY' : 'ROOM READINESS'}</span><h2>{isAdmin ? 'Stay inventory' : 'Room status board'}</h2></div><div className="inventory-heading-actions"><span className="table-count">{visibleRooms.length}{!isAdmin && roomSearch ? ` of ${rooms.length}` : ''} rooms</span>{isAdmin && <button className="button button--outline button--small" type="button" onClick={addDemoRooms} disabled={busy === 'seed'}>{busy === 'seed' ? 'Adding…' : 'Add demo rooms'}</button>}</div></div>
        {!isAdmin && <div className="staff-control-panel"><div className="staff-filter-tabs" role="group" aria-label="Filter room status">
          <button className={roomView === 'all' ? 'is-active' : ''} type="button" onClick={() => setRoomView('all')}>All rooms <span>{rooms.length}</span></button>
          <button className={roomView === 'available' ? 'is-active' : ''} type="button" onClick={() => setRoomView('available')}>Ready <span>{rooms.filter(room => room.status === 'Available').length}</span></button>
          <button className={roomView === 'occupied' ? 'is-active' : ''} type="button" onClick={() => setRoomView('occupied')}>Occupied <span>{occupiedCount}</span></button>
          <button className={roomView === 'attention' ? 'is-active' : ''} type="button" onClick={() => setRoomView('attention')}>Needs attention <span>{rooms.filter(room => ['Cleaning', 'Maintenance'].includes(room.status)).length}</span></button>
        </div><label className="staff-control-search"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><input type="search" value={roomSearch} onChange={event => setRoomSearch(event.target.value)} placeholder="Search room, name or city…" aria-label="Search rooms" /></label></div>}
        <div className="management-table-wrap"><table className="management-table"><thead><tr><th>ROOM</th><th>STAY</th><th>TYPE</th>{isAdmin && <th>BASE RATE / NIGHT</th>}<th>STATUS</th>{isAdmin && <th>MANAGE</th>}</tr></thead><tbody>{visibleRooms.map(room => <tr key={room._id}><td><strong>#{room.roomNumber}</strong></td><td><strong>{room.title}</strong><small>{[room.city, room.country].filter(Boolean).join(', ')}</small></td><td>{room.category}<small>Up to {room.capacity} guests</small></td>{isAdmin && <td><div className="inline-price-edit"><input id={`room-price-${room._id}`} type="number" min="1" defaultValue={room.pricePerNight} aria-label={`Base rate for room ${room.roomNumber}`} /><button className="table-link" type="button" onClick={() => saveRoomPrice(room)}>Save</button></div></td>}<td><select className="status-select" aria-label={`Set status for room ${room.roomNumber}`} value={room.status} onChange={event => handleRoomStatus(room, event.target.value)}><option>Available</option><option>Occupied</option><option>Cleaning</option><option>Maintenance</option></select></td>{isAdmin && <td><button className="table-link table-link--danger" type="button" onClick={() => handleDeleteRoom(room)} disabled={busy === room._id}>Remove</button></td>}</tr>)}</tbody></table>{visibleRooms.length === 0 && <div className="table-empty">{roomSearch ? 'No rooms match that search.' : 'There are no rooms in this view.'}</div>}</div>
      </section>

      {isAdmin && <section className="seasonal-section"><div className="add-room-intro"><span className="eyebrow">SMART RATE MANAGEMENT</span><h2>Seasonal<br /><em>pricing.</em></h2><p>Add date-based rates for peak dates. Overlapping seasons are blocked, and the booking total is calculated night by night.</p></div><div className="seasonal-panel"><form className="seasonal-form" onSubmit={addSeasonalRate}><div className="room-form__heading"><span className="eyebrow">NEW SEASON</span><h3>Set a date range and rate</h3></div><div className="form-grid"><label className="form-field form-field--wide"><span>Room</span><select value={season.roomId} onChange={event => setSeason({ ...season, roomId: event.target.value })} required><option value="">Choose a room</option>{rooms.map(room => <option key={room._id} value={room._id}>#{room.roomNumber} · {room.title}</option>)}</select></label><label className="form-field"><span>Season label</span><input value={season.label} onChange={event => setSeason({ ...season, label: event.target.value })} placeholder="e.g. Winter holiday" maxLength={60} required /></label><label className="form-field"><span>Nightly rate (₹)</span><input type="number" min="1" value={season.pricePerNight} onChange={event => setSeason({ ...season, pricePerNight: event.target.value })} required /></label><label className="form-field"><span>Starts</span><input type="date" value={season.startDate} onChange={event => setSeason({ ...season, startDate: event.target.value })} required /></label><label className="form-field"><span>Ends (exclusive)</span><input type="date" min={season.startDate ? addDaysToDateInput(season.startDate, 1) : undefined} value={season.endDate} onChange={event => setSeason({ ...season, endDate: event.target.value })} required /></label></div><button className="button button--dark" type="submit" disabled={busy === 'season' || !season.roomId}>{busy === 'season' ? 'Saving…' : 'Save seasonal rate'} <i className="fa-solid fa-arrow-right" /></button></form>
          <div className="seasonal-rate-list"><h3>Active seasonal rates</h3>{rooms.flatMap(room => (room.seasonalRates || []).map(rate => ({ room, rate }))).length ? rooms.flatMap(room => (room.seasonalRates || []).map(rate => <div className="seasonal-rate-row" key={`${room._id}-${rate._id}`}><span><strong>{rate.label}</strong><small>Room {room.roomNumber} · {formatDate(rate.startDate)}–{formatDate(rate.endDate)}</small></span><b>{money(rate.pricePerNight)} / night</b><button className="table-link table-link--danger" type="button" onClick={() => removeSeasonalRate(room._id, rate._id)}>Remove</button></div>)) : <p className="muted-copy">No seasonal rates yet.</p>}</div>
        </div></section>}

      {isAdmin && <section className="management-section"><div className="dashboard-list-head"><div><span className="eyebrow">COLLECTION GROWTH</span><h2>Add a room</h2></div></div>
        <form className="room-form" onSubmit={handleAddRoom}><div className="form-grid"><label className="form-field"><span>Room number</span><input value={newRoom.roomNumber} onChange={event => setNewRoom({ ...newRoom, roomNumber: event.target.value })} required /></label><label className="form-field"><span>Stay name</span><input value={newRoom.title} onChange={event => setNewRoom({ ...newRoom, title: event.target.value })} required /></label><label className="form-field"><span>City</span><input value={newRoom.city} onChange={event => setNewRoom({ ...newRoom, city: event.target.value })} required /></label><label className="form-field"><span>Country</span><input value={newRoom.country} onChange={event => setNewRoom({ ...newRoom, country: event.target.value })} required /></label><label className="form-field"><span>Room type</span><select value={newRoom.category} onChange={event => setNewRoom({ ...newRoom, category: event.target.value })}><option>Standard</option><option>Deluxe</option><option>Suite</option><option>Presidential</option></select></label><label className="form-field"><span>Price per night (₹)</span><input type="number" min="1" value={newRoom.pricePerNight} onChange={event => setNewRoom({ ...newRoom, pricePerNight: event.target.value })} required /></label><label className="form-field"><span>Guest capacity</span><input type="number" min="1" max="20" value={newRoom.capacity} onChange={event => setNewRoom({ ...newRoom, capacity: Number(event.target.value) })} required /></label><label className="form-field"><span>Cover image URL</span><input type="url" value={newRoom.image} onChange={event => setNewRoom({ ...newRoom, image: event.target.value })} placeholder="https://…" /></label><label className="form-field form-field--wide"><span>Amenities <small>Separate with commas</small></span><input value={newRoom.amenities} onChange={event => setNewRoom({ ...newRoom, amenities: event.target.value })} /></label><label className="form-field form-field--wide"><span>Description</span><textarea value={newRoom.description} onChange={event => setNewRoom({ ...newRoom, description: event.target.value })} rows={3} required /></label></div><label className="check-field"><input type="checkbox" checked={newRoom.freeCancellationUntilCheckIn} onChange={event => setNewRoom({ ...newRoom, freeCancellationUntilCheckIn: event.target.checked })} /><span>Offer free cancellation before check-in</span></label><button className="button button--dark" type="submit" disabled={busy === 'room'}>{busy === 'room' ? 'Adding stay…' : 'Add to collection'} <i className="fa-solid fa-arrow-right" /></button></form>
      </section>}

      {isAdmin && <section className="management-section" id="payments"><div className="dashboard-list-head"><div><span className="eyebrow">TRANSACTION LEDGER</span><h2>Payments and refunds</h2></div><span className="table-count">{payments.length} records</span></div><div className="management-table-wrap"><table className="management-table"><thead><tr><th>GUEST</th><th>BOOKING</th><th>METHOD</th><th>AMOUNT</th><th>STATUS</th><th>RECEIVED BY</th></tr></thead><tbody>{payments.map(payment => <tr key={payment._id}><td><strong>{payment.guest?.name || 'Guest'}</strong><small>{payment.guest?.email || ''}</small></td><td>{payment.booking?._id?.toString?.().slice(-8).toUpperCase() || 'Reservation'}<small>{payment.booking?.bookingStatus}</small></td><td>{payment.method}<small>{payment.transactionId || payment.orderId || 'At property'}</small></td><td>{money(payment.amount)}</td><td><span className={statusClass(payment.status)}>{payment.status}</span></td><td>{payment.recordedBy?.name || (payment.method === 'razorpay' ? 'Online' : '—')}</td></tr>)}</tbody></table>{payments.length === 0 && <div className="table-empty">No payments have been recorded yet. Guests can pay at the property; online checkout appears when gateway keys are configured.</div>}</div></section>}

      {isAdmin && <section className="reports-section"><div className="dashboard-list-head"><div><span className="eyebrow">BUSINESS OVERVIEW</span><h2>Reports & analytics</h2></div><span className="table-count">Last six months</span></div><div className="reports-grid"><div className="report-card"><h3>Monthly collected revenue</h3><div className="report-bars">{(report.monthlyRevenue || []).map(item => <div className="report-bar" key={item._id} title={`${money(item.revenue)} · ${item.payments} payments`}><div style={{ height: `${Math.max(3, Number(item.revenue || 0) / revenueMax * 100)}%` }} /><small>{item._id}</small><b>{money(item.revenue)}</b></div>)}{!report.monthlyRevenue?.length && <p className="muted-copy">Payments will appear here as guests settle their bookings.</p>}</div></div><div className="report-card"><h3>Reservation status</h3>{(report.bookingStatuses || []).map(item => <div className="report-row" key={item._id}><span className={statusClass(item._id)}>{item._id}</span><strong>{item.count}</strong></div>)}{!report.bookingStatuses?.length && <p className="muted-copy">No reservation data yet.</p>}</div></div></section>}

      {isAdmin && <section className="management-section" id="team">
        <div className="dashboard-list-head team-section-heading"><div><span className="eyebrow">ACCESS CONTROL</span><h2>Users &amp; staff</h2><p className="muted-copy">Create staff or administrator logins and manage existing account access.</p></div><div className="team-section-actions"><span className="table-count">{users.length} accounts</span><button className="button button--dark button--small" type="button" onClick={() => setTeamFormOpen(open => !open)}><i className={`fa-solid ${teamFormOpen ? 'fa-xmark' : 'fa-user-plus'}`} />{teamFormOpen ? 'Close form' : 'Add team account'}</button></div></div>
        {teamFormOpen && <form className="room-form team-account-form" onSubmit={createTeamAccount}>
          <div className="room-form__heading"><span className="eyebrow">NEW HOTEL TEAM MEMBER</span><h3>Create a staff or admin login</h3><p className="muted-copy">Share the initial password with the new team member privately. It is stored as a password hash.</p></div>
          <div className="form-grid">
            <label className="form-field"><span>Full name</span><input autoComplete="name" value={teamAccount.name} onChange={event => setTeamAccount({ ...teamAccount, name: event.target.value })} minLength={2} maxLength={80} required /></label>
            <label className="form-field"><span>Email address</span><input type="email" autoComplete="email" value={teamAccount.email} onChange={event => setTeamAccount({ ...teamAccount, email: event.target.value })} maxLength={254} required /></label>
            <label className="form-field"><span>Phone number</span><input type="tel" autoComplete="tel" value={teamAccount.phone} onChange={event => setTeamAccount({ ...teamAccount, phone: event.target.value })} maxLength={30} /></label>
            <label className="form-field"><span>Initial password <small>12 characters or more</small></span><input type="password" autoComplete="new-password" value={teamAccount.password} onChange={event => setTeamAccount({ ...teamAccount, password: event.target.value })} minLength={12} maxLength={128} required /></label>
            <label className="form-field"><span>Access role</span><select value={teamAccount.role} onChange={event => setTeamAccount({ ...teamAccount, role: event.target.value })}><option value="staff">Staff · Front desk</option><option value="admin">Administrator</option></select></label>
          </div>
          <div className="team-account-form__actions"><button className="button button--dark" type="submit" disabled={busy === 'team-account'}>{busy === 'team-account' ? 'Creating account…' : 'Create team account'} <i className="fa-solid fa-arrow-right" /></button><button className="table-link" type="button" onClick={() => setTeamFormOpen(false)}>Cancel</button></div>
        </form>}
        <div className="management-table-wrap"><table className="management-table"><thead><tr><th>ACCOUNT</th><th>CONTACT</th><th>CREATED</th><th>ACCESS ROLE</th></tr></thead><tbody>{users.map(account => <tr key={account._id}><td><strong>{account.name}</strong></td><td>{account.email}<small>{account.phone || 'Phone not added'}</small></td><td>{formatDate(account.createdAt)}</td><td><select className="status-select" value={account.role} disabled={busy === account._id || account._id === user?._id} aria-label={`Role for ${account.name}`} onChange={event => updateRole(account, event.target.value)}><option value="guest">Guest</option><option value="staff">Staff</option><option value="admin">Admin</option></select></td></tr>)}</tbody></table>{users.length === 0 && <div className="table-empty">No accounts yet. Create your first team login above.</div>}</div>
      </section>}

      {isAdmin && <section className="management-section"><div className="dashboard-list-head"><div><span className="eyebrow">SECURITY & ACCOUNTABILITY</span><h2>Admin activity log</h2></div><span className="table-count">Latest 100 changes</span></div><div className="management-table-wrap"><table className="management-table"><thead><tr><th>WHEN</th><th>ACTOR</th><th>ACTION</th><th>RECORD</th><th>DETAIL</th></tr></thead><tbody>{activity.map(item => <tr key={item._id}><td>{new Date(item.createdAt).toLocaleString()}</td><td>{item.actor?.name || 'System'}<small>{item.actor?.email || ''}</small></td><td>{item.action}</td><td>{item.entityType}<small>{item.entityId}</small></td><td>{item.details || '—'}</td></tr>)}</tbody></table>{activity.length === 0 && <div className="table-empty">Administrative changes will be recorded here.</div>}</div></section>}
    </section>
  );
}
