import { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function ResetPassword() {
  const { token } = useParams(); // Grabs the token directly from the URL
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
      
      // Redirect back to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired token.');
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-sm border-0 rounded-4 p-4">
            <h4 className="fw-bold text-center text-primary mb-4">Set New Password</h4>
            
            {message ? (
              <div className="alert alert-success text-center">
                {message.text} <br/> Redirecting to login...
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && <div className="alert alert-danger py-2">{error}</div>}
                
                <div className="mb-4">
                  <label className="form-label text-muted small fw-semibold">New Password</label>
                  <input 
                    type="password" 
                    className="form-control bg-light py-2" 
                    placeholder="Enter new password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    required 
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100 rounded-pill fw-bold">
                  Update Password
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;