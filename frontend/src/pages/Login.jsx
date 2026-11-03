import React, { useContext, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext, API_URL } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState(() => new URLSearchParams(window.location.search).get('mode') === 'team' ? 'team' : 'guest');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email: email.trim(), password });
      const isTeamAccount = ['staff', 'admin'].includes(response.data.role);
      if (accountType === 'team' && !isTeamAccount) {
        throw new Error('This is a guest account. Choose Guest sign-in to continue.');
      }
      if (accountType === 'guest' && isTeamAccount) {
        throw new Error('This is a hotel team account. Choose Staff & admin sign-in to continue.');
      }
      login(response.data);
      navigate(location.state?.from || (isTeamAccount ? '/admin-dashboard' : '/'), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'We could not sign you in. Check your details and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-layout">
      <div className="auth-photo auth-photo--signin"><div className="auth-photo__caption"><span className="eyebrow eyebrow--light">WELCOME BACK</span><p>“A good stay begins<br />the moment you arrive.”</p><span>YOUR NEXT CHAPTER IS WAITING</span></div></div>
      <div className="auth-panel"><span className="eyebrow">YOUR HOTELPRO ACCOUNT</span><h1>Good to have<br />you <em>back.</em></h1><p className="auth-panel__intro">{accountType === 'team' ? 'Access reservations and hotel operations with your team account.' : 'Sign in to pick up where your next journey begins.'}</p>
        {error && <div className="form-error" role="alert"><i className="fa-solid fa-circle-exclamation" />{error}</div>}
        <div className="login-mode-switch" role="group" aria-label="Sign-in type">
          <button type="button" className={accountType === 'guest' ? 'is-active' : ''} aria-pressed={accountType === 'guest'} onClick={() => { setAccountType('guest'); setError(''); }}>Guest</button>
          <button type="button" className={accountType === 'team' ? 'is-active' : ''} aria-pressed={accountType === 'team'} onClick={() => { setAccountType('team'); setError(''); }}>Staff &amp; admin</button>
        </div>
        {accountType === 'team' && <p className="team-login-note"><i className="fa-solid fa-shield-halved" /> Team accounts are created by your HotelPro administrator.</p>}
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="form-field"><span>Email address</span><input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} required /></label>
          <label className="form-field"><span>Password</span><span className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={event => setPassword(event.target.value)} required /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}><i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} /></button></span></label>
          <button className="button button--dark button--full" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} {!busy && <i className="fa-solid fa-arrow-right" />}</button>
        </form>
        <p className="auth-panel__switch">New to HotelPro? <Link to="/register">Create an account</Link></p>
        <div className="auth-assurance"><i className="fa-solid fa-lock" /> Your details are protected with secure sign-in.</div>
      </div>
    </section>
  );
}
