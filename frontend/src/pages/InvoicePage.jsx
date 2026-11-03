import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { API_URL } from '../context/AuthContext';
import { formatDate } from '../dateUtils';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function InvoicePage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    axios.get(`${API_URL}/bookings/${id}/invoice`).then(response => setInvoice(response.data)).catch(err => setError(err.response?.data?.message || 'Unable to open this invoice.'));
  }, [id]);
  if (!invoice) return <div className="container page-message"><span className="eyebrow">HOTELPRO INVOICE</span><h1>{error ? 'Invoice unavailable' : 'Preparing your invoice…'}</h1><p>{error || 'Loading reservation details.'}</p><Link className="button button--outline" to="/guest-dashboard">Back to your stays</Link></div>;

  const { booking } = invoice;
  return <main className="invoice-wrap container"><div className="invoice-actions"><Link className="text-link" to="/guest-dashboard"><i className="fa-solid fa-arrow-left" /> Back to your stays</Link><button className="button button--dark" type="button" onClick={() => window.print()}><i className="fa-solid fa-print" /> Print / Save PDF</button></div>
    <article className="invoice-sheet"><header className="invoice-header"><Link to="/" className="brand-mark"><span className="brand-mark__icon"><i className="fa-solid fa-h" /></span><span>hotel<span>pro</span></span></Link><div><span className="eyebrow">STAY RECEIPT</span><strong>{invoice.invoiceNumber}</strong></div></header>
      <div className="invoice-title"><span className="eyebrow">THANK YOU FOR CHOOSING HOTELPRO</span><h1>Your stay, <em>confirmed.</em></h1><p>Booking reference {booking._id.slice(-8).toUpperCase()}</p></div>
      <div className="invoice-info"><section><span className="eyebrow">GUEST</span><strong>{booking.user?.name}</strong><span>{booking.user?.email}</span><span>{booking.user?.phone || 'Phone not provided'}</span></section><section><span className="eyebrow">PROPERTY</span><strong>{booking.room?.title}</strong><span>Room {booking.room?.roomNumber} · {booking.room?.category}</span><span>{[booking.room?.city, booking.room?.country].filter(Boolean).join(', ')}</span></section></div>
      <div className="invoice-dates"><div><small>CHECK IN</small><strong>{formatDate(booking.checkInDate)}</strong></div><i className="fa-solid fa-arrow-right" /><div><small>CHECK OUT</small><strong>{formatDate(booking.checkOutDate)}</strong></div><div><small>GUESTS</small><strong>{booking.guestsCount || 1}</strong></div><div><small>BOOKING STATUS</small><strong>{booking.bookingStatus}</strong></div></div>
      <div className="invoice-total"><span>Accommodation total</span><strong>{money(booking.totalAmount)}</strong></div><div className="invoice-payment"><span>Payment status: <strong>{booking.paymentStatus}</strong></span><span>{booking.paymentStatus === 'Paid' ? 'Paid in full' : 'Pay at the property'}</span></div>
      <footer className="invoice-footer"><span>HotelPro · Thoughtful stays, made simple.</span><span>Generated {new Date().toLocaleDateString()}</span></footer>
    </article>
  </main>;
}
