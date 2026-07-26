import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

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
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-sm border-0 rounded-4 p-4">
            <h4 className="fw-bold text-center text-primary mb-3">Reset Password</h4>
            <p className="text-muted text-center small mb-4">
              Enter the email address associated with your account, and we will send you a link to reset your password.
            </p>
            
            {message && <div className="alert alert-success py-2">{message.text}</div>}
            {error && <div className="alert alert-danger py-2">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <input 
                  type="email" 
                  className="form-control bg-light py-2" 
                  placeholder="Enter your email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary w-100 rounded-pill fw-bold" 
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            
            <div className="text-center mt-4">
              <Link to="/login" className="text-decoration-none text-secondary small fw-semibold">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;