import React, { useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL, AuthContext } from '../context/AuthContext';

export default function NotificationMenu() {
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');
  const rootRef = useRef(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const response = await axios.get(`${API_URL}/notifications`);
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
      setError('');
    } catch (err) {
      setError('Notifications are unavailable right now.');
    }
  };

  useEffect(() => {
    if (user) load();
    else { setNotifications([]); setUnreadCount(0); }
  }, [user?._id]);

  useEffect(() => {
    const close = event => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openNotification = async notification => {
    if (!notification.readAt) {
      try { await axios.put(`${API_URL}/notifications/${notification._id}/read`); } catch { /* Keep navigation available even when read state cannot sync. */ }
    }
    setOpen(false);
    navigate(notification.link || '/');
    load();
  };

  const markAllRead = async () => {
    try { await axios.put(`${API_URL}/notifications/read-all`); await load(); } catch { setError('Unable to mark notifications as read.'); }
  };

  if (!user) return null;
  return (
    <div className="notification-menu" ref={rootRef}>
      <button className="icon-button notification-trigger" type="button" aria-label={`${unreadCount} unread notifications`} aria-expanded={open} onClick={() => { setOpen(value => !value); if (!open) load(); }}>
        <i className="fa-regular fa-bell" aria-hidden="true" />{unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && <section className="notification-popover" aria-label="Notifications"><header><div><span className="eyebrow">YOUR HOTELPRO INBOX</span><strong>Notifications</strong></div>{unreadCount > 0 && <button type="button" onClick={markAllRead}>Mark all read</button>}</header>
        {error ? <p className="notification-empty">{error}</p> : notifications.length ? <div className="notification-list">{notifications.map(item => <button type="button" className={`notification-item ${item.readAt ? '' : 'is-unread'}`} key={item._id} onClick={() => openNotification(item)}><span className={`notification-item__icon notification-item__icon--${item.kind}`}><i className={`fa-solid ${item.kind === 'payment' ? 'fa-receipt' : item.kind === 'service' ? 'fa-bell-concierge' : item.kind === 'booking' ? 'fa-calendar-check' : 'fa-circle-info'}`} /></span><span className="notification-item__copy"><strong>{item.title}</strong><span>{item.message}</span><small>{new Date(item.createdAt).toLocaleString()}</small></span>{!item.readAt && <i className="notification-item__dot" />}</button>)}</div> : <p className="notification-empty">You’re all caught up. New booking updates will appear here.</p>}
      </section>}
    </div>
  );
}
