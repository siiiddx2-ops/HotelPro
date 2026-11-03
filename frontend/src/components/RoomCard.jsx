import React from 'react';
import { Link } from 'react-router-dom';

const formatPrice = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function RoomCard({ room, search }) {
  const rating = room.reviewCount ? (Number(room.averageRating) * 2).toFixed(1) : null;
  const destination = [room.city, room.country].filter(Boolean).join(', ') || 'India';
  const detailUrl = `/room/${room._id}${search ? `?${search}` : ''}`;

  return (
    <article className="stay-card">
      <Link to={detailUrl} className="stay-card__image-link" aria-label={`View ${room.title}`}>
        <div className="stay-card__image-wrap">
          <img
            className="stay-card__image"
            src={room.images?.[0] || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1100&q=85'}
            alt={room.title}
            loading="lazy"
          />
          <span className="stay-card__category">{room.category}</span>
        </div>
      </Link>

      <div className="stay-card__body">
        <div className="stay-card__eyebrow">
          <span><i className="fa-solid fa-location-dot" aria-hidden="true" /> {destination}</span>
          {room.freeCancellationUntilCheckIn !== false && <span className="stay-card__cancel">Free cancellation</span>}
        </div>

        <Link to={detailUrl} className="stay-card__title">{room.title}</Link>
        <p className="stay-card__description">{room.description}</p>

        <div className="stay-card__amenities" aria-label="Room amenities">
          {(room.amenities || []).slice(0, 3).map(amenity => <span key={amenity}>{amenity}</span>)}
          <span>Up to {room.capacity} guests</span>
        </div>

        <div className="stay-card__bottom">
          <div className="stay-card__rating">
            {rating ? <><span className="rating-score">{rating}</span><span>{Number(rating) >= 9 ? 'Exceptional' : 'Wonderful'}<small>{room.reviewCount} guest reviews</small></span></> : <span className="rating-new">New to HotelPro</span>}
          </div>
          <div className="stay-card__price">
            <span>From</span>
            <strong>{formatPrice(room.averageNightlyRate || room.pricePerNight)}</strong>
            <small>{room.averageNightlyRate ? 'average / night' : 'per night'}</small>
          </div>
        </div>

        <Link to={detailUrl} className="stay-card__cta">View stay <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
      </div>
    </article>
  );
}
