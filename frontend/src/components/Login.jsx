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
    <div className="card shadow-sm mx-auto mt-4" style={{ maxWidth: '500px' }}>
      <div className="card-header bg-success text-white text-center">
        <h4>Medinex Login</h4>
      </div>
      <div className="card-body">
        {statusMessage && (
          <div className={`alert alert-${statusMessage.type}`} role="alert">
            {statusMessage.text}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input type="password" className="form-control" name="password" value={formData.password} onChange={handleChange} required />
          </div>
          
          {/* 2. Added Forgot Password Link Here */}
          <div className="text-end mb-4">
            <Link to="/forgot-password" className="text-decoration-none small text-success fw-bold">
              Forgot Password?
            </Link>
          </div>

          <button type="submit" className="btn btn-success w-100">Login</button>
        </form>
      </div>
    </div>
  );
}

export default Login;