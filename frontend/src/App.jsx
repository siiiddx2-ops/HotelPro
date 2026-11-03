import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import RoomDetails from './pages/RoomDetails';
import GuestDashboard from './pages/GuestDashboard';
import AdminDashboard from './pages/AdminDashboard';
import InvoicePage from './pages/InvoicePage';

function RequireAuth({ children, roles }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Link to="/" className="brand-mark brand-mark--inverse">
              <span className="brand-mark__icon"><i className="fa-solid fa-h" aria-hidden="true" /></span>
              <span>hotel<span>pro</span></span>
            </Link>
            <p>Thoughtful stays, made simple.<br />Find a room that feels like it was waiting for you.</p>
          </div>
          <div className="site-footer__links">
            <div><span className="footer-heading">Explore</span><Link to="/#stays">Find a stay</Link><Link to="/#collection">Our collection</Link></div>
            <div><span className="footer-heading">Your account</span><Link to="/guest-dashboard">Manage a trip</Link><Link to="/register">Create an account</Link></div>
            <div><span className="footer-heading">HotelPro</span><a href="mailto:hello@hotelpro.local">Contact us</a><span>Support, whenever you need it</span></div>
          </div>
        </div>
        <div className="site-footer__bottom"><span>© 2026 HotelPro. Made for better stays.</span><span><i className="fa-solid fa-location-dot" aria-hidden="true" /> Made with care in India</span></div>
      </div>
    </footer>
  );
}

function AppShell() {
  return (
    <Router>
      <div className="app-frame">
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/room/:id" element={<RoomDetails />} />
            <Route path="/invoice/:id" element={<RequireAuth><InvoicePage /></RequireAuth>} />
            <Route path="/guest-dashboard" element={<RequireAuth roles={['guest']}><GuestDashboard /></RequireAuth>} />
            <Route path="/admin-dashboard" element={<RequireAuth roles={['staff', 'admin']}><AdminDashboard /></RequireAuth>} />
            <Route path="*" element={<div className="empty-state container"><span className="eyebrow">404 · Not found</span><h1>This page wandered off.</h1><p>Come back to the collection and find somewhere lovely to stay.</p><Link to="/" className="button button--dark">Back to HotelPro</Link></div>} />
          </Routes>
        </main>
        <SiteFooter />
      </div>
    </Router>
  );
}

export default function App() {
  return <ThemeProvider><AuthProvider><AppShell /></AuthProvider></ThemeProvider>;
}
