import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Register() {
  // Added license_number to initial state
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'Patient', license_number: '' });
  const [licenseFile, setLicenseFile] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setLicenseFile(e.target.files[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('password', formData.password);
    data.append('role', formData.role);
    
    // Append hospital-specific fields
    if (formData.role === 'Hospital') {
        if (licenseFile) data.append('license_file', licenseFile);
        data.append('license_number', formData.license_number);
    }

    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatusMessage({ type: 'success', text: response.data.message });
      setFormData({ name: '', email: '', password: '', role: 'Patient', license_number: '' });
      setLicenseFile(null);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Registration failed.';
      setStatusMessage({ type: 'danger', text: errorMsg });
    }
  };

  return (
    <div className="d-flex justify-content-center" style={{ marginTop: '4rem' }}>
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ maxWidth: '480px', width: '100%' }}>
        <div className="text-center pt-5 pb-4 px-4" style={{ background: 'linear-gradient(135deg, var(--ink), var(--primary))' }}>
          <div className="bg-white bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3 border border-white border-opacity-25" style={{ width: '56px', height: '56px', fontSize: '1.5rem' }}>📝</div>
          <h4 className="fw-bold text-white mb-1">Create your account</h4>
          <p className="text-white text-opacity-75 small mb-0">Join Medinex as a patient, hospital or pharmacist</p>
        </div>
        <div className="card-body p-4 p-md-5">
          {statusMessage && <div className={`alert alert-${statusMessage.type} rounded-3`}>{statusMessage.text}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-medium text-dark small">Full Name</label>
              <input type="text" className="form-control rounded-3 py-2" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="mb-3">
              <label className="form-label fw-medium text-dark small">Email</label>
              <input type="email" className="form-control rounded-3 py-2" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="mb-3">
              <label className="form-label fw-medium text-dark small">Password</label>
              <input type="password" className="form-control rounded-3 py-2" name="password" value={formData.password} onChange={handleChange} required />
            </div>
            <div className="mb-3">
              <label className="form-label fw-medium text-dark small">Role</label>
              <select className="form-select rounded-3 py-2" name="role" value={formData.role} onChange={handleChange}>
                <option value="Patient">Patient</option>
                <option value="Hospital">Hospital</option>
                {/* <option value="Doctor">Doctor</option> */}
                <option value="Pharmacist">Pharmacist</option>
              </select>
            </div>

            {/* Hospital specific fields block */}
            {formData.role === 'Hospital' && (
                <div className="mb-4 p-3 rounded-4 bg-light border">
                    <label className="form-label fw-bold small" style={{ color: 'var(--danger)' }}>Hospital License Number (Required)</label>
                    <input type="text" className="form-control rounded-3 mb-3" name="license_number" value={formData.license_number} onChange={handleChange} required placeholder="e.g., MED-123456" />

                    <label className="form-label fw-bold small" style={{ color: 'var(--danger)' }}>Upload License Document (Required)</label>
                    <input type="file" className="form-control rounded-3" onChange={handleFileChange} accept=".jpg,.png,.pdf" required />
                </div>
            )}

            <button type="submit" className="btn btn-primary w-100 rounded-pill fw-bold py-2 shadow-sm mt-2">Register</button>
          </form>
          <p className="text-center text-muted small mt-4 mb-0">
            Already have an account? <Link to="/login" className="fw-bold text-decoration-none" style={{ color: 'var(--primary)' }}>Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;