import React, { useContext, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext, API_URL } from '../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const update = event => setFormData(current => ({ ...current, [event.target.name]: event.target.value }));

  const handleSubmit = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/auth/register`, { ...formData, name: formData.name.trim(), email: formData.email.trim() });
      login(response.data);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'We could not create your account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-layout">
      <div className="auth-photo auth-photo--join"><div className="auth-photo__caption"><span className="eyebrow eyebrow--light">A BETTER STAY STARTS HERE</span><p>Find the pause<br />you’ve been <em>looking for.</em></p><span>THOUGHTFUL STAYS, MADE SIMPLE</span></div></div>
      <div className="auth-panel"><span className="eyebrow">BECOME A HOTELPRO GUEST</span><h1>Make room for<br />something <em>good.</em></h1><p className="auth-panel__intro">Create your guest account and keep every upcoming stay in one place.</p>
        {error && <div className="form-error" role="alert"><i className="fa-solid fa-circle-exclamation" />{error}</div>}
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="form-field"><span>Full name</span><input name="name" autoComplete="name" placeholder="Your name" value={formData.name} onChange={update} minLength={2} maxLength={80} required /></label>
          <label className="form-field"><span>Email address</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com" value={formData.email} onChange={update} required /></label>
          <label className="form-field"><span>Phone number</span><input name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={formData.phone} onChange={update} required /></label>
          <label className="form-field"><span>Password</span><input name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={formData.password} onChange={update} minLength={8} required /></label>
          <p className="form-hint"><i className="fa-solid fa-shield-halved" /> New accounts are created as guests. Hotel staff access is managed by your property administrator.</p>
          <button className="button button--dark button--full" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create your account'} {!busy && <i className="fa-solid fa-arrow-right" />}</button>
        </form>
        <p className="auth-panel__switch">Already a guest? <Link to="/login">Sign in</Link></p>
      </div>
    </section>
  );
}
