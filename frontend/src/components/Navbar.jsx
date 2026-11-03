import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationMenu from './NotificationMenu';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);
  const handleLogout = () => {
    logout();
    closeMenu();
    navigate('/');
  };
  const homeAnchor = id => location.pathname === '/' ? `#${id}` : `/#${id}`;

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="brand-mark" onClick={closeMenu} aria-label="HotelPro home">
          <span className="brand-mark__icon"><i className="fa-solid fa-h" aria-hidden="true" /></span>
          <span>hotel<span>pro</span></span>
        </Link>

        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <Link to={homeAnchor('stays')} onClick={closeMenu}>Stays</Link>
          <Link to={homeAnchor('collection')} onClick={closeMenu}>The collection</Link>
          <Link to={homeAnchor('story')} onClick={closeMenu}>Our promise</Link>
        </nav>

        <div className="site-header__actions">
          <span className="header-currency">INR <span>₹</span></span>
          <button className="icon-button theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} title="Toggle theme">
            <i className={`fa-regular ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`} aria-hidden="true" />
          </button>
          <NotificationMenu />
          {user ? (
            <>
              {user.role === 'admin' || user.role === 'staff' ? (
                <Link className="header-link header-link--quiet" to="/admin-dashboard" onClick={closeMenu}>{user.role === 'admin' ? 'Admin dashboard' : 'Front desk'}</Link>
              ) : (
                <Link className="header-link header-link--quiet" to="/guest-dashboard" onClick={closeMenu}>My trips</Link>
              )}
              <div className="account-chip">
                <span className="account-chip__avatar">{user.name?.charAt(0)?.toUpperCase() || 'G'}</span>
                <span className="account-chip__name">{user.name?.split(' ')[0]}</span>
                <button className="account-chip__logout" type="button" onClick={handleLogout} aria-label="Sign out" title="Sign out">
                  <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link className="header-link header-link--quiet desktop-team-signin" to="/login?mode=team">Staff / admin</Link>
              <Link className="header-link header-link--quiet desktop-signin" to="/login">Sign in</Link>
              <Link className="button button--small button--dark desktop-join" to="/register">Join HotelPro</Link>
            </>
          )}
          <button className="icon-button menu-toggle" type="button" onClick={() => setMenuOpen(open => !open)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
            <i className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars'}`} aria-hidden="true" />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="mobile-menu">
          <Link to={homeAnchor('stays')} onClick={closeMenu}>Explore stays</Link>
          <Link to={homeAnchor('collection')} onClick={closeMenu}>The collection</Link>
          <Link to={homeAnchor('story')} onClick={closeMenu}>Our promise</Link>
          {!user && <><Link to="/login?mode=team" onClick={closeMenu}>Staff &amp; admin sign in</Link><Link to="/login" onClick={closeMenu}>Guest sign in</Link><Link className="button button--dark" to="/register" onClick={closeMenu}>Create an account</Link></>}
          {user && <Link to={user.role === 'guest' ? '/guest-dashboard' : '/admin-dashboard'} onClick={closeMenu}>{user.role === 'guest' ? 'My trips' : user.role === 'admin' ? 'Admin dashboard' : 'Front desk'}</Link>}
        </div>
      )}
    </header>
  );
}
