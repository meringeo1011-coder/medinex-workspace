import { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell';

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const res = await axios.post(`http://localhost:5000/api/auth/reset-password/${token}`, { newPassword });
      setMessage({ type: 'success', text: res.data.message });
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired token.');
    }
  };

  return (
    <AuthShell title="Set a new password" subtitle="Choose something strong you haven't used before.">
      {message ? (
        <div className="mx-alert success">✅ {message.text} Redirecting to sign in…</div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && <div className="mx-alert danger">{error}</div>}
          <div className="mx-field">
            <label className="mx-label">New password</label>
            <input type="password" className="mx-input" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
          </div>
          <button type="submit" className="mx-btn mx-btn-primary mx-btn-block mx-btn-lg">Update password</button>
        </form>
      )}
    </AuthShell>
  );
}

export default ResetPassword;
