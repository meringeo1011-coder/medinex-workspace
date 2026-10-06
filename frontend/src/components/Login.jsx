import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import AuthShell from './AuthShell';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [statusMessage, setStatusMessage] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      navigate('/dashboard');
    } catch (error) {
      setStatusMessage({ type: 'danger', text: error.response?.data?.message || 'Login failed. Check server connection.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back 👋"
      subtitle="Sign in to continue to your Medinex dashboard."
      footer={<>New to Medinex? <Link to="/register">Create an account</Link></>}
    >
      {statusMessage && <div className={`mx-alert ${statusMessage.type}`} role="alert">{statusMessage.text}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mx-field">
          <label className="mx-label" htmlFor="email">Email address</label>
          <div className="mx-input-icon">
            <span className="ic" aria-hidden="true">✉️</span>
            <input id="email" type="email" className="mx-input" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} autoComplete="email" required />
          </div>
        </div>
        <div className="mx-field">
          <label className="mx-label" htmlFor="password">Password</label>
          <div className="mx-pw">
            <input id="password" type={showPw ? 'text' : 'password'} className="mx-input" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} autoComplete="current-password" required />
            <button type="button" onClick={() => setShowPw(!showPw)}>{showPw ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        <Link to="/forgot-password" className="mx-auth-forgot">Forgot password?</Link>
        <button type="submit" className="mx-btn mx-btn-primary mx-btn-block mx-btn-lg" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}

export default Login;
