import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom'; // 1. Added Link here

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [statusMessage, setStatusMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', formData);
      setStatusMessage({ type: 'success', text: response.data.message });
      
      // Store the JWT token securely in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      navigate('/dashboard');
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Login failed. Check server connection.';
      setStatusMessage({ type: 'danger', text: errorMsg });
    }
  };

  return (
    <div className="d-flex justify-content-center" style={{ marginTop: '4rem' }}>
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ maxWidth: '440px', width: '100%' }}>
        <div className="text-center pt-5 pb-4 px-4" style={{ background: 'linear-gradient(135deg, var(--ink), var(--primary))' }}>
          <div className="bg-white bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3 border border-white border-opacity-25" style={{ width: '56px', height: '56px', fontSize: '1.5rem' }}>🔐</div>
          <h4 className="fw-bold text-white mb-1">Welcome back</h4>
          <p className="text-white text-opacity-75 small mb-0">Sign in to your Medinex account</p>
        </div>
        <div className="card-body p-4 p-md-5">
          {statusMessage && (
            <div className={`alert alert-${statusMessage.type} rounded-3`} role="alert">
              {statusMessage.text}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-medium text-dark small">Email Address</label>
              <input type="email" className="form-control rounded-3 py-2" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="mb-3">
              <label className="form-label fw-medium text-dark small">Password</label>
              <input type="password" className="form-control rounded-3 py-2" name="password" value={formData.password} onChange={handleChange} required />
            </div>

            <div className="text-end mb-4">
              <Link to="/forgot-password" className="text-decoration-none small fw-bold" style={{ color: 'var(--primary)' }}>
                Forgot Password?
              </Link>
            </div>

            <button type="submit" className="btn btn-primary w-100 rounded-pill fw-bold py-2 shadow-sm">Login</button>
          </form>
          <p className="text-center text-muted small mt-4 mb-0">
            Don't have an account? <Link to="/register" className="fw-bold text-decoration-none" style={{ color: 'var(--primary)' }}>Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;