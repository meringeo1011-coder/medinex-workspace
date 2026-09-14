import { useState, useEffect } from 'react';
import axios from 'axios';
import ReportCard from './ReportCard';

// Small hover tooltip: wraps any element and shows a styled text box above it on hover
function HoverTooltip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="position-relative d-inline-flex align-items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          className="position-absolute bg-dark text-white rounded-3 shadow-lg p-3 fw-normal"
          style={{
            bottom: '135%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '240px',
            zIndex: 1050,
            fontSize: '0.8rem',
            lineHeight: 1.5,
            whiteSpace: 'normal'
          }}
        >
          {text}
          <span
            className="position-absolute bg-dark"
            style={{
              width: '10px',
              height: '10px',
              bottom: '-5px',
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)'
            }}
          ></span>
        </span>
      )}
    </span>
  );
}

function PatientDashboard() {
  const [profile, setProfile] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [myComplaints, setMyComplaints] = useState([]);

  const [activeTab, setActiveTab] = useState('prescriptions');

  const [allergiesInput, setAllergiesInput] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedSummary, setUploadedSummary] = useState(null);

  const [complaintData, setComplaintData] = useState({ hospital_id: '', doctor_name: '', complaint_text: '' });
  const [complaintStatus, setComplaintStatus] = useState(null);

  // Chatbot States
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { sender: 'ai', text: 'Hello! I am your Medinex AI Assistant. You can ask me how to store your medicines, what common side effects to look out for, or general wellness tips. How can I help you today?' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchProfile();
    fetchPrescriptions();
    fetchReports();
    fetchHospitals();
    fetchMyComplaints();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/patient/profile', { headers });
      setProfile(res.data);
      setAllergiesInput(res.data.allergies || '');
    } catch (err) { console.error(err); }
  };

  const fetchPrescriptions = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/patient/prescriptions', { headers });
      setPrescriptions(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchReports = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/patient/reports', { headers });
      setReports(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchHospitals = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/patient/hospitals', { headers });
      setHospitals(res.data);
    } catch (err) { console.error("Failed to load hospitals", err); }
  };

  const fetchMyComplaints = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/patient/my-complaints', { headers });
      setMyComplaints(res.data);
    } catch (err) { console.error("Failed to load complaint history", err); }
  };

  const handleUpdateAllergies = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/patient/allergies', { allergies: allergiesInput }, { headers });
      fetchProfile();
    } catch (err) { alert('Failed to update allergies.'); }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('Please select a file to upload.');

    const formData = new FormData();
    formData.append('report', file);
    setIsUploading(true);
    setUploadedSummary(null);

    try {
      const res = await axios.post('http://localhost:5000/api/patient/upload-report', formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      setFile(null);
      document.getElementById('fileUploader').value = '';
      setUploadedSummary(res.data.summary || null);
      fetchReports();
    } catch (err) {
      alert('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    setComplaintStatus(null);
    try {
      const res = await axios.post('http://localhost:5000/api/patient/complaint', complaintData, { headers });
      setComplaintStatus({ type: 'success', text: res.data.message });
      setComplaintData({ hospital_id: '', doctor_name: '', complaint_text: '' });
      fetchMyComplaints();
    } catch (err) {
      setComplaintStatus({ type: 'danger', text: err.response?.data?.message || 'Failed to submit.' });
    }
  };

  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newHistory = [...chatHistory, { sender: 'user', text: chatInput }];
    setChatHistory(newHistory);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const activeMeds = prescriptions
        .filter(rx => rx.status === 'Active' || rx.status === 'Dispensed')
        .map(rx => rx.medicine_name)
        .join(', ');

      const res = await axios.post('http://localhost:5000/api/patient/ask-ai', {
        question: chatInput,
        patientContext: activeMeds
      }, { headers });

      setChatHistory([...newHistory, { sender: 'ai', text: res.data.reply }]);
    } catch (err) {
      console.error(err);
      setChatHistory([...newHistory, { sender: 'ai', text: 'Sorry, I am having trouble connecting to the server. Please ensure the backend is running.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="mt-4 text-start">

      {/* PREMIUM HEADER CARD */}
      {profile && (
        <div
          className="card shadow-sm border-0 rounded-4 mb-4 text-white overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--ink), var(--primary))' }}
        >
          <div className="card-body p-4 p-md-5 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <p className="mb-1 text-white-50 fw-semibold text-uppercase tracking-wider small">Patient Portal</p>
              <h2 className="fw-bold mb-0 text-white">{profile.name}</h2>
              <p className="mb-0 text-white text-opacity-75">{profile.email}</p>
            </div>
            <div className="bg-white bg-opacity-10 p-3 rounded-4 border border-white border-opacity-25 text-md-end text-center">
              <span className="d-block small text-white-50 text-uppercase fw-bold mb-1">Secure ID</span>
              <span className="fs-4 fw-bold text-white tracking-widest">
                {profile.patient_unique_id || 'Not Assigned'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="row g-4">

        {/* LEFT COLUMN */}
        <div className={activeTab === 'complaints' || activeTab === 'ai-chat' ? "col-12" : "col-lg-8"}>

          {/* Custom Tabs */}
          <div className="bg-white p-3 rounded-4 shadow-sm d-flex flex-wrap gap-2 mb-4 border">
            <button
              className={`btn rounded-pill px-4 fw-bold ${activeTab === 'prescriptions' ? 'btn-primary' : 'btn-light text-muted border-0'}`}
              onClick={() => setActiveTab('prescriptions')}
            >
              My Medical File
            </button>
            <button
              className={`btn rounded-pill px-4 fw-bold ${activeTab === 'reports' ? 'btn-primary' : 'btn-light text-muted border-0'}`}
              onClick={() => setActiveTab('reports')}
            >
              Lab Reports
            </button>
            <button
              className={`btn rounded-pill px-4 fw-bold ${activeTab === 'complaints' ? 'btn-danger' : 'btn-light text-muted border-0'}`}
              onClick={() => setActiveTab('complaints')}
            >
              File a Complaint
            </button>
            <button
              className={`btn rounded-pill px-4 fw-bold ${activeTab === 'ai-chat' ? 'btn-info text-white shadow-sm' : 'btn-light text-muted border-0'}`}
              onClick={() => setActiveTab('ai-chat')}
            >
              Ask AI Assistant 🤖
            </button>
          </div>

          {/* PRESCRIPTIONS TAB */}
          {activeTab === 'prescriptions' && (
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4 p-md-5">
                <h5 className="fw-bold mb-4 text-dark d-flex align-items-center gap-2">
                  <span className="bg-primary bg-opacity-10 text-primary p-2 rounded-circle d-inline-flex">💊</span>
                  Currently Taking
                </h5>
                <div className="row g-4 mb-5">
                  {prescriptions.filter(rx => rx.status === 'Active' || rx.status === 'Dispensed').length === 0 ? (
                    <div className="col-12 text-center py-4 bg-light rounded-4 border border-dashed">
                      <p className="text-muted mb-0">No active medications right now.</p>
                    </div>
                  ) : (
                    prescriptions.filter(rx => rx.status === 'Active' || rx.status === 'Dispensed').map(rx => (
                      <div key={rx.id} className="col-12">
                        <div className="d-flex flex-column flex-md-row justify-content-between p-3 border border-primary border-opacity-25 bg-primary bg-opacity-10 rounded-4 gap-3 shadow-sm">
                          <div>
                            <h5 className="fw-bold text-primary mb-1">{rx.medicine_name}</h5>
                            <p className="mb-1 text-dark fw-medium">{rx.dosage}</p>
                            <p className="mb-0 text-muted small">{rx.instructions}</p>
                          </div>
                          <div className="text-md-end border-start-md border-primary border-opacity-25 ps-md-3">
                            {rx.status === 'Active' ? (
                              <HoverTooltip text="Prescribed by your doctor — not yet picked up from the pharmacy.">
                                <span className="badge bg-primary rounded-pill px-3 py-2 mb-2 d-inline-block shadow-sm">Active Now</span>
                              </HoverTooltip>
                            ) : (
                              <HoverTooltip text="Collected from the pharmacy — you are currently taking this.">
                                <span className="badge bg-info text-dark rounded-pill px-3 py-2 mb-2 d-inline-block shadow-sm">Picked Up — Taking Now</span>
                              </HoverTooltip>
                            )}
                            <div className="small text-muted"><strong>Dr. {rx.doctor_name}</strong></div>
                            <div className="small text-muted fw-bold">Date: {new Date(rx.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <h5 className="fw-bold mb-4 text-secondary d-flex align-items-center gap-2 border-top pt-4">
                  <span className="bg-secondary bg-opacity-10 text-secondary p-2 rounded-circle d-inline-flex">🕒</span>
                  Medication History
                </h5>
                <div className="row g-3">
                  {prescriptions.filter(rx => rx.status === 'Completed' || rx.status === 'Stopped').length === 0 ? (
                    <div className="col-12 text-center py-4">
                      <p className="text-muted mb-0 small">No past medication history.</p>
                    </div>
                  ) : (
                    prescriptions.filter(rx => rx.status === 'Completed' || rx.status === 'Stopped').map(rx => (
                      <div key={rx.id} className="col-12">
                        <div className="d-flex flex-column flex-md-row justify-content-between p-3 border rounded-4 bg-light gap-3 opacity-75 hover-opacity-100 transition-all">
                          <div>
                            <h6 className="fw-bold text-secondary mb-1">{rx.medicine_name}</h6>
                            <p className="mb-1 text-dark small">{rx.dosage}</p>
                          </div>
                          <div className="text-md-end">
                            {rx.status === 'Stopped' ? (
                              <HoverTooltip text="Your doctor stopped this medication early.">
                                <span className="badge bg-danger bg-opacity-25 text-danger border border-danger rounded-pill px-3 py-1 mb-2 d-inline-block">Discontinued</span>
                              </HoverTooltip>
                            ) : (
                              <HoverTooltip text="You completed the full prescribed duration.">
                                <span className="badge bg-secondary bg-opacity-25 text-secondary border border-secondary rounded-pill px-3 py-1 mb-2 d-inline-block">Course Completed</span>
                              </HoverTooltip>
                            )}
                            <div className="small text-muted" style={{ fontSize: '0.8rem' }}>Dr. {rx.doctor_name} • {new Date(rx.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LAB REPORTS TAB */}
          {activeTab === 'reports' && (
            <div className="row g-4">
              <div className="col-12">
                <div className="card border-2 border-dashed border-primary border-opacity-25 shadow-sm rounded-4 bg-light">
                  <div className="card-body p-5 text-center">
                    <div className="fs-1 text-primary mb-3">📁</div>
                    <h5 className="fw-bold mb-2">Upload a Lab Report</h5>
                    <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: '400px' }}>Add bloodwork, imaging scans, or standard files to your secure medical record. Medinex will automatically read the file and generate a summary for you.</p>
                    <form onSubmit={handleFileUpload} className="d-flex flex-column align-items-center">
                      <label
                        htmlFor="fileUploader"
                        className="w-75 mb-3 d-flex align-items-center gap-3 bg-white border rounded-4 p-3 text-start"
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="fs-4">{file ? '📎' : '⬆️'}</span>
                        <span className="text-truncate">
                          <span className="d-block fw-bold text-dark text-truncate small">
                            {file ? file.name : 'Choose a file to upload'}
                          </span>
                          <span className="d-block text-muted" style={{ fontSize: '0.75rem' }}>
                            {file ? `${(file.size / 1024).toFixed(0)} KB · Ready to upload` : 'PDF, JPG or PNG'}
                          </span>
                        </span>
                      </label>
                      <input
                        type="file"
                        className="d-none"
                        id="fileUploader"
                        onChange={(e) => { setFile(e.target.files[0]); setUploadedSummary(null); }}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      <button type="submit" className="btn btn-primary rounded-pill px-5 fw-bold shadow-sm d-flex align-items-center gap-2" disabled={isUploading || !file}>
                        {isUploading && <span className="spinner-border spinner-border-sm" role="status"></span>}
                        {isUploading ? 'Reading document…' : 'Save to Profile'}
                      </button>
                    </form>

                    {uploadedSummary && (
                      <div className="mx-auto mt-4 text-start" style={{ maxWidth: '520px' }}>
                        <ReportCard
                          report={{
                            file_name: file?.name || reports[0]?.file_name || 'Latest upload',
                            uploaded_at: new Date().toISOString(),
                            summary: uploadedSummary
                          }}
                          fileUrl={reports[0] ? `http://localhost:5000/uploads/${reports[0].file_path}` : '#'}
                          highlight
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="col-12">
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body p-4 p-md-5">
                    <h5 className="fw-bold mb-4 text-dark d-flex align-items-center gap-2">
                      <span className="bg-primary bg-opacity-10 text-primary p-2 rounded-circle d-inline-flex">📚</span>
                      Document History
                    </h5>
                    {reports.length === 0 ? (
                      <div className="text-center text-muted p-4">No documents uploaded yet.</div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {reports.map(report => (
                          <ReportCard
                            key={report.id}
                            report={report}
                            fileUrl={`http://localhost:5000/uploads/${report.file_path}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPLAINTS TAB */}
          {activeTab === 'complaints' && (
            <div className="mx-auto" style={{ maxWidth: '900px' }}>
              <div className="card border-0 shadow-sm rounded-4 border-top border-danger border-4 mb-5">
                <div className="card-body p-4 p-md-5">
                  <div className="d-flex align-items-center gap-3 mb-4">
                    <div className="bg-danger bg-opacity-10 text-danger p-3 rounded-circle d-inline-flex fs-4">📝</div>
                    <div>
                      <h4 className="fw-bold text-dark mb-1">File a Grievance</h4>
                      <p className="text-muted small mb-0">Submit a formal complaint directly to hospital administration.</p>
                    </div>
                  </div>
                  {complaintStatus && (
                    <div className={`alert alert-${complaintStatus.type} rounded-4 py-3 mb-4 shadow-sm`}>{complaintStatus.text}</div>
                  )}
                  <form onSubmit={handleComplaintSubmit} className="bg-light p-4 rounded-4 border">
                    <div className="mb-3">
                      <label className="form-label fw-bold text-dark">Select Hospital</label>
                      <select className="form-select form-select-lg rounded-3 border-0 shadow-sm" value={complaintData.hospital_id} onChange={(e) => setComplaintData({ ...complaintData, hospital_id: e.target.value })} required>
                        <option value="">-- Select the facility involved --</option>
                        {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-bold text-dark">Doctor's Name</label>
                      <input type="text" className="form-control form-control-lg rounded-3 border-0 shadow-sm" placeholder="e.g., Dr. Arun Kumar" value={complaintData.doctor_name} onChange={(e) => setComplaintData({ ...complaintData, doctor_name: e.target.value })} required />
                    </div>
                    <div className="mb-4">
                      <label className="form-label fw-bold text-dark">Complaint Details</label>
                      <textarea className="form-control rounded-3 border-0 shadow-sm p-3" rows="5" placeholder="Please describe your experience in detail. This information is kept strictly confidential." value={complaintData.complaint_text} onChange={(e) => setComplaintData({ ...complaintData, complaint_text: e.target.value })} required></textarea>
                    </div>
                    <div className="text-end">
                      <button type="submit" className="btn btn-danger btn-lg rounded-pill px-5 fw-bold shadow">Submit Confidential Report</button>
                    </div>
                  </form>
                </div>
              </div>

              <h5 className="fw-bold mb-4 text-dark border-bottom pb-2">My Complaint History</h5>
              {myComplaints.length === 0 ? (
                <div className="text-center p-5 bg-white shadow-sm rounded-4 border">
                  <p className="text-muted mb-0">You have not submitted any complaints.</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {myComplaints.map(complaint => (
                    <div key={complaint.id} className="card border-0 shadow-sm rounded-4">
                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3 border-bottom pb-3">
                          <div>
                            <h6 className="fw-bold text-dark mb-1">{complaint.hospital_name}</h6>
                            <small className="text-muted">Regarding: Dr. {complaint.doctor_name}</small>
                          </div>
                          <div>
                            {complaint.status === 'Pending' && <span className="badge bg-warning text-dark px-3 py-2 rounded-pill shadow-sm">Pending Review</span>}
                            {complaint.status === 'Reviewed' && <span className="badge bg-primary px-3 py-2 rounded-pill shadow-sm">Under Review</span>}
                            {complaint.status === 'Resolved' && <span className="badge bg-success px-3 py-2 rounded-pill shadow-sm">Resolved</span>}
                          </div>
                        </div>
                        <p className="mb-2 text-dark opacity-75 small">{complaint.complaint_text}</p>
                        <small className="text-muted fw-bold">Submitted on {new Date(complaint.created_at).toLocaleDateString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI CHATBOT TAB */}
          {activeTab === 'ai-chat' && (
            <div className="mx-auto w-100">
              <div className="card border-0 shadow-lg rounded-4 border-top border-info border-4 overflow-hidden">
                <div className="card-body p-0 d-flex flex-column" style={{ height: '75vh', minHeight: '600px' }}>

                  {/* Chat Header */}
                  <div className="d-flex align-items-center gap-3 p-4 bg-light border-bottom">
                    <div className="bg-info bg-opacity-10 text-info p-3 rounded-circle d-inline-flex fs-3 shadow-sm">🤖</div>
                    <div>
                      <h4 className="fw-bold text-dark mb-1">Medinex Assistant</h4>
                      <p className="text-muted small mb-0">Powered by Google AI. Ask me about your prescribed medicines!</p>
                    </div>
                  </div>

                  {/* Chat History Window */}
                  <div className="flex-grow-1 overflow-auto p-4 d-flex flex-column gap-4 bg-white">
                    {chatHistory.map((msg, index) => (
                      <div key={index} className={`d-flex ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                        <div
                          className={`p-3 rounded-4 shadow-sm ${msg.sender === 'user' ? 'text-white' : 'bg-light text-dark border'}`}
                          style={{
                            maxWidth: '80%',
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.6',
                            background: msg.sender === 'user' ? 'linear-gradient(135deg, var(--primary), var(--teal))' : '#f8f9fa',
                            borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
                            borderBottomLeftRadius: msg.sender === 'ai' ? '4px' : '16px'
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="d-flex justify-content-start">
                        <div className="p-3 rounded-4 bg-light text-muted border fst-italic shadow-sm d-flex align-items-center gap-2">
                          <div className="spinner-border spinner-border-sm text-info" role="status"></div>
                          Medinex Assistant is thinking...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input Box */}
                  <div className="p-4 bg-light border-top">
                    <form onSubmit={handleAskAI}>
                      <div className="input-group input-group-lg shadow-sm rounded-pill overflow-hidden border bg-white p-1">
                        <input
                          type="text"
                          className="form-control border-0 px-4 bg-transparent"
                          placeholder="Ask 'What are my prescribed medicines?'..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          disabled={isChatLoading}
                          style={{ boxShadow: 'none' }}
                        />
                        <button type="submit" className="btn btn-info text-white rounded-pill px-5 fw-bold fs-5" disabled={isChatLoading || !chatInput.trim()}>
                          Send 🚀
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Sidebar (hidden on complaints / ai-chat tabs) */}
        {activeTab !== 'complaints' && activeTab !== 'ai-chat' && (
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm rounded-4 position-sticky" style={{ top: '20px' }}>
              <div className="bg-danger rounded-top-4" style={{ height: '6px' }}></div>
              <div className="card-body p-4 p-xl-5">
                <div className="d-flex align-items-center gap-3 mb-4 border-bottom pb-3">
                  <div className="bg-danger bg-opacity-10 p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                    <span className="fs-5">⚠️</span>
                  </div>
                  <h5 className="fw-bold text-dark mb-0">Safety Alerts</h5>
                </div>

                <div className="mb-4">
                  <p className="text-muted small fw-bold text-uppercase mb-3 tracking-wider">Recorded Allergies</p>
                  {profile?.allergies ? (
                    <div className="d-flex flex-wrap gap-2">
                      {profile.allergies.split(/[\n,]+/).map((allergy, index) => {
                        const trimmed = allergy.trim();
                        if (!trimmed) return null;
                        return (
                          <span key={index} className="badge bg-danger text-white px-3 py-2 rounded-pill shadow-sm fw-medium" style={{ fontSize: '0.9rem' }}>
                            {trimmed}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-success bg-opacity-10 border border-success border-opacity-25 rounded-4">
                      <p className="fw-bold text-success mb-0 d-flex align-items-center gap-2">
                        <span>✅</span> No known allergies.
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-light p-4 rounded-4 mt-4 border border-light-subtle">
                  <form onSubmit={handleUpdateAllergies}>
                    <label className="form-label small fw-bold text-dark mb-2">Update Allergy Info</label>
                    <textarea
                      className="form-control border-0 shadow-sm rounded-3 mb-3 p-3"
                      rows="2"
                      placeholder="Separate with commas (e.g. Peanuts, Aspirin)"
                      value={allergiesInput}
                      onChange={(e) => setAllergiesInput(e.target.value)}
                    ></textarea>
                    <button type="submit" className="btn btn-dark w-100 fw-bold rounded-pill shadow-sm">
                      Save Updates
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default PatientDashboard;
