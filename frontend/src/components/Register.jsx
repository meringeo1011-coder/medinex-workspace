import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import AuthShell from './AuthShell';

const ROLES = [
  { id: 'Patient', icon: '🧑‍⚕️', label: 'Patient', hint: 'Track prescriptions & reports' },
  { id: 'Hospital', icon: '🏥', label: 'Hospital', hint: 'Manage doctors & patients' },
  { id: 'Pharmacist', icon: '💊', label: 'Pharmacist', hint: 'Verify & dispense safely' },
];

function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'Patient', license_number: '' });
  const [licenseFile, setLicenseFile] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('password', formData.password);
    data.append('role', formData.role);
    if (formData.role === 'Hospital') {
      if (licenseFile) data.append('license_file', licenseFile);
      data.append('license_number', formData.license_number);
    }

    setLoading(true);
    setStatusMessage(null);
    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatusMessage({ type: 'success', text: response.data.message });
      setFormData({ name: '', email: '', password: '', role: 'Patient', license_number: '' });
      setLicenseFile(null);
    } catch (error) {
      setStatusMessage({ type: 'danger', text: error.response?.data?.message || 'Registration failed.' });
    } finally {
      setLoading(false);
    }
  };

  const isHospital = formData.role === 'Hospital';

  return (
    <AuthShell
      wide
      title="Create your account"
      subtitle="Choose how you will use Medinex, then fill in your details."
      footer={<>Already registered? <Link to="/login">Sign in</Link></>}
    >
      {statusMessage && <div className={`mx-alert ${statusMessage.type}`}>{statusMessage.text}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mx-field">
          <span className="mx-label">I am a…</span>
          <div className="mx-role-pick">
            {ROLES.map(r => (
              <button type="button" key={r.id} className={`mx-role-opt ${formData.role === r.id ? 'on' : ''}`} onClick={() => setFormData({ ...formData, role: r.id })}>
                <span className="ico">{r.icon}</span>{r.label}<small>{r.hint}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="mx-field">
          <label className="mx-label">{isHospital ? 'Hospital name' : 'Full name'}</label>
          <input type="text" className="mx-input" name="name" placeholder={isHospital ? 'e.g., City General Hospital' : 'e.g., Anna Thomas'} value={formData.name} onChange={handleChange} required />
        </div>
        <div className="mx-field">
          <label className="mx-label">Email</label>
          <input type="email" className="mx-input" name="email" placeholder="you@example.com" autoComplete="email" value={formData.email} onChange={handleChange} required />
        </div>
        <div className="mx-field">
          <label className="mx-label">Password</label>
          <div className="mx-pw">
            <input type={showPw ? 'text' : 'password'} className="mx-input" name="password" placeholder="At least 6 characters" value={formData.password} onChange={handleChange} required minLength={6} autoComplete="new-password" />
            <button type="button" onClick={() => setShowPw(!showPw)}>{showPw ? 'Hide' : 'Show'}</button>
          </div>
        </div>

        {isHospital && (
          <div className="mx-alert info fade-in" style={{ display: 'block' }}>
            <strong>Hospitals are reviewed before going live.</strong>
            <div className="mx-field mt-3">
              <label className="mx-label">License number</label>
              <input type="text" className="mx-input" name="license_number" value={formData.license_number} onChange={handleChange} required placeholder="e.g., MED-123456" />
            </div>
            <div className="mx-field mb-0">
              <label className="mx-label">License document (JPG, PNG or PDF)</label>
              <input type="file" className="mx-input" onChange={(e) => setLicenseFile(e.target.files[0])} accept=".jpg,.png,.pdf" required />
            </div>
          </div>
        )}

        <button type="submit" className="mx-btn mx-btn-primary mx-btn-block mx-btn-lg mt-2" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}

export default Register;
