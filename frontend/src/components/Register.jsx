import { useState } from 'react';
import axios from 'axios';

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
    <div className="card shadow-sm mx-auto mt-4" style={{ maxWidth: '500px' }}>
      <div className="card-header bg-primary text-white text-center">
        <h4>Medinex Registration</h4>
      </div>
      <div className="card-body">
        {statusMessage && <div className={`alert alert-${statusMessage.type}`}>{statusMessage.text}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-control" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input type="password" className="form-control" name="password" value={formData.password} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Role</label>
            <select className="form-select" name="role" value={formData.role} onChange={handleChange}>
              <option value="Admin">Admin</option>
              <option value="Patient">Patient</option>
              <option value="Hospital">Hospital</option>
                {/* <option value="Doctor">Doctor</option> */}              <option value="Pharmacist">Pharmacist</option>
            </select>
          </div>
          
          {/* Hospital specific fields block */}
          {formData.role === 'Hospital' && (
              <div className="mb-4 p-3 border rounded bg-light">
                  <label className="form-label fw-bold text-danger">Hospital License Number (Required)</label>
                  <input type="text" className="form-control mb-3" name="license_number" value={formData.license_number} onChange={handleChange} required placeholder="e.g., MED-123456" />

                  <label className="form-label fw-bold text-danger">Upload License Document (Required)</label>
                  <input type="file" className="form-control" onChange={handleFileChange} accept=".jpg,.png,.pdf" required />
              </div>
          )}

          <button type="submit" className="btn btn-primary w-100 mt-2">Register</button>
        </form>
      </div>
    </div>
  );
}

export default Register;