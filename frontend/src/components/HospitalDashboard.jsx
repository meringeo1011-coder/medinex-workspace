import { useState, useEffect } from 'react';
import axios from 'axios';

const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

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
    <div className="mx-container text-start">
      <div className="mx-hero fade-in d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <div className="eyebrow">Hospital portal</div>
          <h2>Hospital administration</h2>
          <p className="sub">Manage your doctors and review patient complaints.</p>
        </div>
        <div className="d-flex gap-3">
          <div className="mx-idbadge"><small>Doctors</small><strong>{doctors.length}</strong></div>
          <div className="mx-idbadge"><small>Open complaints</small><strong>{complaints.filter(c => c.status !== 'Resolved').length}</strong></div>
        </div>
      </div>

      <div className="mx-tabs">
        <button className={`mx-tab ${activeTab === 'doctors' ? 'on' : ''}`} onClick={() => setActiveTab('doctors')}>🩺 Manage doctors</button>
        <button className={`mx-tab ${activeTab === 'complaints' ? 'on' : ''}`} onClick={() => setActiveTab('complaints')}>
          ⚑ Patient complaints{complaints.filter(c => c.status !== 'Resolved').length > 0 && <span className="count">{complaints.filter(c => c.status !== 'Resolved').length}</span>}
        </button>
      </div>

      {message && <div className={`mx-alert ${message.type}`}>{message.text}</div>}

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
        <div className="fade-in">
          <h5 className="mx-card-title">Patient complaints</h5>
          <p className="mx-card-sub">Each complaint arrives with the full details of the prescription it is about.</p>
          {complaints.length === 0 ? (
            <div className="mx-card mx-card-pad"><div className="mx-empty"><span className="big">🕊️</span>No patient complaints reported.</div></div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {complaints.map(comp => (
                <div key={comp.id} className="mx-card mx-card-pad">
                  {/* header: patient + status */}
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                    <div>
                      <div className="fw-bold">{comp.patient_name}</div>
                      <div className="small text-muted">
                        {comp.patient_unique_id && <span className="mx-code-tag me-2">{comp.patient_unique_id}</span>}
                        Filed {fmt(comp.created_at)}
                      </div>
                    </div>
                    <span className={`mx-pill ${comp.status}`}>{comp.status}</span>
                  </div>

                  {/* prescription details */}
                  <div style={{ background: '#f8fafc', border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
                    <div className="small fw-bold text-uppercase text-muted mb-2" style={{ letterSpacing: '.04em' }}>Prescription details</div>
                    {comp.medicine_name ? (
                      <div className="row g-3">
                        <div className="col-sm-6 col-lg-3"><div className="small text-muted">Medicine</div><div className="fw-bold">💊 {comp.medicine_name}</div></div>
                        <div className="col-sm-6 col-lg-3"><div className="small text-muted">Dosage</div><div className="fw-semibold">{comp.dosage || '—'}</div></div>
                        <div className="col-sm-6 col-lg-3"><div className="small text-muted">Duration</div><div className="fw-semibold">{comp.duration_days ? `${comp.duration_days} days` : '—'}</div></div>
                        <div className="col-sm-6 col-lg-3"><div className="small text-muted">Prescribed by</div><div className="fw-semibold">{comp.doctor_name}</div></div>
                        <div className="col-sm-6 col-lg-3"><div className="small text-muted">Prescribed on</div><div className="fw-semibold">{fmt(comp.prescribed_on)}</div></div>
                        <div className="col-sm-6 col-lg-3"><div className="small text-muted">Prescription status</div><div><span className={`mx-pill ${comp.prescription_status}`}>{comp.prescription_status}</span></div></div>
                        <div className="col-sm-6 col-lg-3">
                          <div className="small text-muted">Pharmacy</div>
                          <div className="fw-semibold">{comp.dispensed_at ? `Dispensed ${fmt(comp.dispensed_at)}${comp.days_supplied ? ` (${comp.days_supplied} days)` : ''}` : 'Not dispensed yet'}</div>
                        </div>
                        <div className="col-12">
                          {comp.patient_allergies ? (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 14px' }}>
                              <div className="small fw-bold text-danger">⚠️ Patient allergies</div>
                              <div className="d-flex flex-wrap gap-2 mt-1">
                                {comp.patient_allergies.split(/[\n,]+/).map(a => a.trim()).filter(Boolean).map((a, i) => (
                                  <span key={i} className="mx-pill Stopped" style={{ fontSize: '.82rem' }}>{a}</span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="mx-alert success mb-0">✅ No known allergies recorded for this patient.</div>
                          )}
                        </div>
                        {comp.instructions && (
                          <div className="col-12"><div className="small text-muted">Instructions</div><div>📝 {comp.instructions}</div></div>
                        )}
                      </div>
                    ) : <span className="text-muted">The linked prescription is no longer available.</span>}
                  </div>

                  {/* the complaint itself */}
                  <div className="mt-3">
                    <div className="small fw-bold text-uppercase text-muted mb-1" style={{ letterSpacing: '.04em' }}>Complaint</div>
                    <p className="mb-0" style={{ color: 'var(--ink-soft)' }}>{comp.complaint_text}</p>
                  </div>

                  {comp.status !== 'Resolved' && (
                    <div className="text-end mt-3">
                      <button className="mx-btn mx-btn-soft" style={{ padding: '6px 14px', fontSize: '.8rem' }} onClick={() => handleResolveComplaint(comp.id, comp.status)}>
                        {comp.status === 'Pending' ? 'Mark reviewed' : 'Mark resolved'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HospitalDashboard;