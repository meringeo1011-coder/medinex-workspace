import { useState, useEffect } from 'react';
import axios from 'axios';

function HospitalDashboard() {
  const [activeTab, setActiveTab] = useState('doctors');
  const [doctors, setDoctors] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [message, setMessage] = useState('');
  
  const [formData, setFormData] = useState({ name: '', email: '', password: '', specialization: '' });
  
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchDoctors();
    fetchComplaints();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/hospital/doctors', { headers });
      setDoctors(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchComplaints = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/hospital/complaints', { headers });
      setComplaints(res.data);
    } catch (err) { console.error(err); }
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/hospital/doctors', formData, { headers });
      setMessage({ type: 'success', text: res.data.message });
      setFormData({ name: '', email: '', password: '', specialization: '' });
      fetchDoctors();
    } catch (error) {
      setMessage({ type: 'danger', text: error.response?.data?.message || 'Failed to add doctor.' });
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const handleRemoveDoctor = async (id) => {
    if (!window.confirm("Are you sure you want to remove this doctor?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/hospital/doctors/${id}`, { headers });
      fetchDoctors();
    } catch (err) { console.error(err); }
  };

  const handleResolveComplaint = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Pending' ? 'Reviewed' : 'Resolved';
    try {
      await axios.put(`http://localhost:5000/api/hospital/complaints/${id}/status`, { status: newStatus }, { headers });
      fetchComplaints();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="mt-2 text-start">
      
      {/* Upgraded Modern Pill Tabs */}
      <ul className="nav nav-pills mb-4 gap-3 border-bottom pb-3">
        <li className="nav-item">
          <button 
            className={`nav-link rounded-pill px-4 fw-bold ${activeTab === 'doctors' ? 'active shadow-sm' : 'text-muted hover-bg-light'}`} 
            onClick={() => setActiveTab('doctors')}
          >
            Manage Doctors
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link rounded-pill px-4 fw-bold ${activeTab === 'complaints' ? 'active bg-danger shadow-sm' : 'text-muted hover-bg-light'}`} 
            onClick={() => setActiveTab('complaints')}
          >
            Patient Complaints
          </button>
        </li>
      </ul>

      {message && <div className={`alert alert-${message.type} shadow-sm rounded-3`}>{message.text}</div>}

      {/* DOCTORS TAB */}
      {activeTab === 'doctors' && (
        <div className="row g-4">
          
          {/* Add Doctor Form (Stylized Card) */}
          <div className="col-lg-4">
            <div className="card shadow-sm border-0 rounded-4 h-100">
              <div className="card-body p-4">
                <h5 className="text-primary fw-bold mb-4">Create Doctor Account</h5>
                <form onSubmit={handleAddDoctor}>
                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold small mb-1">Doctor Full Name</label>
                    <input type="text" className="form-control bg-light border-0 py-2" placeholder="Dr. John Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold small mb-1">Specialization</label>
                    <input type="text" className="form-control bg-light border-0 py-2" placeholder="e.g., Cardiology" value={formData.specialization} onChange={e => setFormData({...formData, specialization: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold small mb-1">Login Username (Email)</label>
                    <input type="email" className="form-control bg-light border-0 py-2" placeholder="doctor@hospital.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                  </div>
                  <div className="mb-4">
                    <label className="form-label text-secondary fw-semibold small mb-1">Initial Password</label>
                    <input type="text" className="form-control bg-light border-0 py-2" placeholder="TempPass123" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                  </div>
                  <button type="submit" className="btn btn-primary w-100 rounded-pill fw-bold py-2 shadow-sm">
                    + Add Doctor
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Doctors List Table (Stylized Card) */}
          <div className="col-lg-8">
            <div className="card shadow-sm border-0 rounded-4 h-100">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="text-dark fw-bold mb-0">Your Active Doctors</h5>
                  <span className="badge bg-primary rounded-pill px-3 py-2">{doctors.length} Doctors</span>
                </div>
                
                {doctors.length === 0 ? (
                  <div className="text-center p-5 bg-light rounded-4 text-muted">
                    No doctors have been added yet.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="text-uppercase text-secondary small fw-bold py-3 rounded-start">Name</th>
                          <th className="text-uppercase text-secondary small fw-bold py-3">Specialization</th>
                          <th className="text-uppercase text-secondary small fw-bold py-3">Username / Email</th>
                          <th className="text-uppercase text-secondary small fw-bold py-3 rounded-end text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody className="border-top-0">
                        {doctors.map(doc => (
                          <tr key={doc.id}>
                            <td className="fw-bold py-3">{doc.name}</td>
                            <td className="py-3">
                              <span className="badge bg-light text-dark border px-2 py-1">{doc.specialization}</span>
                            </td>
                            <td className="text-muted py-3">{doc.email}</td>
                            <td className="text-end py-3">
                              <button className="btn btn-sm btn-light text-danger border rounded-pill px-3 fw-semibold" onClick={() => handleRemoveDoctor(doc.id)}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPLAINTS TAB */}
      {activeTab === 'complaints' && (
        <div className="card shadow-sm border-0 rounded-4">
          <div className="card-body p-4">
            <h5 className="text-danger fw-bold mb-4">Patient Complaints Review</h5>
            {complaints.length === 0 ? (
              <div className="text-center p-5 bg-light rounded-4 text-muted">
                No patient complaints reported.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="text-uppercase text-secondary small fw-bold py-3 rounded-start">Date</th>
                      <th className="text-uppercase text-secondary small fw-bold py-3">Patient</th>
                      <th className="text-uppercase text-secondary small fw-bold py-3">Doctor Involved</th>
                      <th className="text-uppercase text-secondary small fw-bold py-3">Complaint Details</th>
                      <th className="text-uppercase text-secondary small fw-bold py-3">Status</th>
                      <th className="text-uppercase text-secondary small fw-bold py-3 rounded-end text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody className="border-top-0">
                    {complaints.map(comp => (
                      <tr key={comp.id}>
                        <td className="text-muted py-3">{new Date(comp.created_at).toLocaleDateString()}</td>
                        <td className="fw-bold py-3">{comp.patient_name}</td>
                        <td className="py-3">{comp.doctor_name}</td>
                        <td className="py-3 text-muted">{comp.complaint_text}</td>
                        <td className="py-3">
                          <span className={`badge rounded-pill px-3 py-2 ${comp.status === 'Resolved' ? 'bg-success' : comp.status === 'Reviewed' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                            {comp.status}
                          </span>
                        </td>
                        <td className="text-end py-3">
                          {comp.status !== 'Resolved' && (
                            <button className="btn btn-sm btn-outline-success rounded-pill px-3 fw-semibold" onClick={() => handleResolveComplaint(comp.id, comp.status)}>
                              {comp.status === 'Pending' ? 'Mark Reviewed' : 'Mark Resolved'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default HospitalDashboard;