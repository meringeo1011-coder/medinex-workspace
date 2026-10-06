import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import AuthShell from './AuthShell';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setIsLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      setMessage({ type: 'success', text: res.data.message });
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your account email and we'll send you a secure reset link."
      footer={<Link to="/login">← Back to sign in</Link>}
    >
      {message && <div className="mx-alert success">{message.text}</div>}
      {error && <div className="mx-alert danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mx-field">
          <label className="mx-label">Email address</label>
          <input type="email" className="mx-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button type="submit" className="mx-btn mx-btn-primary mx-btn-block mx-btn-lg" disabled={isLoading}>
          {isLoading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  );
}

export default ForgotPassword;
