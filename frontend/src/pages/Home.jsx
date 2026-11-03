import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_URL } from '../context/AuthContext';
import { addDaysToDateInput, toDateInputValue } from '../dateUtils';
import RoomCard from '../components/RoomCard';

const categories = [
  { name: 'All', icon: 'fa-layer-group', label: 'All stays' },
  { name: 'Standard', icon: 'fa-bed', label: 'Comfort' },
  { name: 'Deluxe', icon: 'fa-sun', label: 'Deluxe' },
  { name: 'Suite', icon: 'fa-crown', label: 'Suites' },
  { name: 'Presidential', icon: 'fa-gem', label: 'Signature' }
];

const formatPrice = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function Home() {
  const today = toDateInputValue(new Date());
  const tomorrow = addDaysToDateInput(today, 1);
  const [rooms, setRooms] = useState([]);
  const [destination, setDestination] = useState('');
  const [appliedDestination, setAppliedDestination] = useState('');
  const [category, setCategory] = useState('All');
  const [maxPrice, setMaxPrice] = useState(20000);
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests, setGuests] = useState(2);
  const [freeCancelOnly, setFreeCancelOnly] = useState(false);
  const [breakfastOnly, setBreakfastOnly] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [displayCount, setDisplayCount] = useState(6);

  const fetchRooms = useCallback(async () => {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setError('Check-out must be after check-in.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const response = await axios.get(`${API_URL}/rooms`, {
        params: { category, maxPrice, checkIn, checkOut, guestsCount: guests, destination: appliedDestination.trim() }
      });
      setRooms(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'We could not load stays just now. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [appliedDestination, category, checkIn, checkOut, guests, maxPrice]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);
  useEffect(() => { setDisplayCount(6); }, [category, appliedDestination, maxPrice, freeCancelOnly, breakfastOnly]);

  const visibleRooms = useMemo(() => rooms
    .filter(room => !freeCancelOnly || room.freeCancellationUntilCheckIn !== false)
    .filter(room => !breakfastOnly || room.amenities?.some(item => item.toLowerCase().includes('breakfast')))
    .sort((a, b) => sortBy === 'priceLow' ? a.pricePerNight - b.pricePerNight : sortBy === 'priceHigh' ? b.pricePerNight - a.pricePerNight : 0),
  [rooms, freeCancelOnly, breakfastOnly, sortBy]);
  const displayedRooms = visibleRooms.slice(0, displayCount);

  const nights = Math.max(1, Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000));
  const query = new URLSearchParams({ checkIn, checkOut, guestsCount: String(guests) }).toString();

  const submitSearch = event => {
    event.preventDefault();
    setAppliedDestination(destination);
  };

  return (
    <>
      <section className="hero" id="collection">
        <div className="hero__image" aria-hidden="true" />
        <div className="container hero__content">
          <span className="eyebrow eyebrow--light"><span /> STAYS WITH A SENSE OF PLACE</span>
          <h1>Go somewhere.<br /><em>Feel more.</em></h1>
          <p>Thoughtfully chosen rooms for the moments you’ll remember long after you return.</p>
          <a className="hero__link" href="#stays">Explore the collection <i className="fa-solid fa-arrow-down" aria-hidden="true" /></a>
        </div>
        <div className="hero__note"><span>01 / 04</span><span>THE HOTELPRO COLLECTION</span></div>
      </section>

      <section className="search-section" aria-label="Find a stay">
        <form className="search-panel container" onSubmit={submitSearch}>
          <label className="search-field search-field--destination">
            <span className="search-field__label"><i className="fa-solid fa-location-dot" aria-hidden="true" /> DESTINATION</span>
            <input value={destination} onChange={event => setDestination(event.target.value)} placeholder="City, landmark or hotel" aria-label="Destination" />
          </label>
          <label className="search-field">
            <span className="search-field__label"><i className="fa-regular fa-calendar" aria-hidden="true" /> CHECK IN</span>
            <input type="date" value={checkIn} min={today} onChange={event => { const value = event.target.value; setCheckIn(value); if (checkOut <= value) setCheckOut(addDaysToDateInput(value, 1)); }} aria-label="Check in" required />
          </label>
          <label className="search-field">
            <span className="search-field__label"><i className="fa-regular fa-calendar" aria-hidden="true" /> CHECK OUT</span>
            <input type="date" value={checkOut} min={addDaysToDateInput(checkIn, 1)} onChange={event => setCheckOut(event.target.value)} aria-label="Check out" required />
          </label>
          <label className="search-field search-field--guests">
            <span className="search-field__label"><i className="fa-regular fa-user" aria-hidden="true" /> GUESTS</span>
            <select value={guests} onChange={event => setGuests(Number(event.target.value))} aria-label="Guests">
              {[1, 2, 3, 4, 5, 6].map(count => <option key={count} value={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>)}
            </select>
          </label>
          <button className="button button--gold search-panel__submit" type="submit">Find a stay <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
        </form>
      </section>

      <section className="trust-strip container" aria-label="HotelPro guest benefits">
        <div><span className="trust-strip__icon"><i className="fa-solid fa-shield-halved" /></span><span><strong>Book with confidence</strong><small>Clear terms, no surprises</small></span></div>
        <div><span className="trust-strip__icon"><i className="fa-solid fa-key" /></span><span><strong>Handpicked stays</strong><small>Comfort in every detail</small></span></div>
        <div><span className="trust-strip__icon"><i className="fa-regular fa-heart" /></span><span><strong>Made for your moment</strong><small>Find your kind of getaway</small></span></div>
      </section>

      <section className="collection-section" id="stays">
        <div className="container">
          <div className="section-heading">
            <div><span className="eyebrow">A GOOD PLACE TO BEGIN</span><h2>Find your kind of stay</h2><p>Each room is a little invitation to slow down and settle in.</p></div>
            <span className="section-heading__count">{visibleRooms.length.toString().padStart(2, '0')} <small>stays</small></span>
          </div>

          <div className="category-tabs" role="group" aria-label="Filter by stay type">
            {categories.map(item => <button key={item.name} type="button" className={category === item.name ? 'category-tab is-active' : 'category-tab'} onClick={() => { setCategory(item.name); setTimeout(() => document.getElementById('stays')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); }}><i className={`fa-solid ${item.icon}`} aria-hidden="true" />{item.label}</button>)}
          </div>

          <div className="collection-toolbar">
            <div className="filter-toggles">
              <label className="toggle-label"><input type="checkbox" checked={freeCancelOnly} onChange={event => setFreeCancelOnly(event.target.checked)} /><span>Free cancellation</span></label>
              <label className="toggle-label"><input type="checkbox" checked={breakfastOnly} onChange={event => setBreakfastOnly(event.target.checked)} /><span>Breakfast included</span></label>
              <label className="price-filter">Up to <strong>{formatPrice(maxPrice)}</strong><input aria-label="Maximum nightly price" type="range" min="2500" max="20000" step="500" value={maxPrice} onChange={event => setMaxPrice(Number(event.target.value))} /></label>
            </div>
            <label className="sort-select">Sort by <select value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="recommended">Recommended</option><option value="priceLow">Price: low to high</option><option value="priceHigh">Price: high to low</option></select></label>
          </div>

          {error && <div className="inline-message inline-message--error" role="alert">{error}<button type="button" onClick={() => fetchRooms()}>Try again</button></div>}
          {loading ? <div className="loading-state"><span className="loader" /><span>Finding your next favourite place…</span></div> : visibleRooms.length ? (
            <>
              <div className={`stay-grid ${displayedRooms.length === 1 ? 'stay-grid--single' : displayedRooms.length === 2 ? 'stay-grid--two' : ''}`}>{displayedRooms.map(room => <RoomCard key={room._id} room={room} search={query} />)}</div>
              {displayCount < visibleRooms.length && <div className="collection-more"><button className="button button--outline" type="button" onClick={() => setDisplayCount(count => count + 6)}>Show more stays <span>({visibleRooms.length - displayCount} left)</span></button></div>}
            </>
          ) : (
              <div className="empty-state collection-empty"><span className="empty-state__icon"><i className="fa-solid fa-magnifying-glass" /></span><h3>{searched ? 'No stays match this search' : 'Our collection is being prepared'}</h3><p>Try another destination or dates, or clear a few filters to see more options.</p><button className="button button--outline" type="button" onClick={() => { setDestination(''); setAppliedDestination(''); setCategory('All'); setMaxPrice(20000); setFreeCancelOnly(false); setBreakfastOnly(false); }}>Clear filters</button></div>
          )}
        </div>
      </section>

      <section className="story-section" id="story">
        <div className="container story-section__inner">
          <div className="story-section__image" role="img" aria-label="Sunlit hotel suite with a calm, welcoming interior" />
          <div className="story-section__copy"><span className="eyebrow eyebrow--light">A LITTLE MORE HUMAN</span><h2>Travel is better<br />when it feels <em>personal.</em></h2><p>From a room that fits your rhythm to the details that make arriving easy, we bring care into every step of your stay.</p><div className="story-points"><span><i className="fa-solid fa-check" /> Simple, secure booking</span><span><i className="fa-solid fa-check" /> Guest support when you need it</span></div><Link to="/register" className="button button--gold">Make yourself at home <i className="fa-solid fa-arrow-right" /></Link></div>
        </div>
      </section>

      <section className="closing-note container"><span className="eyebrow">THE ART OF GETTING AWAY</span><p>“The best journeys bring you closer to the feeling you were looking for.”</p><span>— HOTELPRO</span></section>
    </>
  );
}
