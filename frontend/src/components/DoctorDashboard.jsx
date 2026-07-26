import { useState } from 'react';
import axios from 'axios';

function DoctorDashboard() {
  const [searchId, setSearchId] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [reports, setReports] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [error, setError] = useState('');

  // Prescription Form States
  const [medicineName, setMedicineName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [dosageForm, setDosageForm] = useState({
  amount: '', days: '', morning: false, afternoon: false, night: false, meal: 'After Food'
});

  // NEW: AI States
  const [aiWarning, setAiWarning] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setPatientData(null);
    setReports([]);
    setPrescriptions([]);

    if (!searchId.trim()) return setError('Please enter a Patient ID.');

    try {
      const formattedId = searchId.trim().toUpperCase();
      const res = await axios.get(`http://localhost:5000/api/doctor/search-patient/${formattedId}`, { headers });
      
      setPatientData(res.data.profile);
      setReports(res.data.reports);
      setPrescriptions(res.data.prescriptions);
    } catch (err) {
      setError(err.response?.data?.message || 'Patient not found or server error.');
    }
  };

  // NEW: AI Interaction Check Function
  const handleCheckInteraction = async () => {
    if (!medicineName.trim()) return;
    
    setIsChecking(true);
    setAiWarning(null);
    
    try {
      const currentMeds = prescriptions.filter(rx => rx.status === 'Active').map(rx => rx.medicine_name);
      
      const res = await axios.post('http://localhost:5000/api/doctor/check-interaction', 
        { currentMedicines: currentMeds, newMedicine: medicineName }, 
        { headers }
      );

      if (res.data.status === 'warning') {
        setAiWarning({ type: 'danger', text: `⚠️ AI Alert: ${res.data.message}` });
      } else {
        setAiWarning({ type: 'success', text: '✅ AI Check: Safe to prescribe.' });
      }
    } catch (err) {
      setAiWarning({ type: 'secondary', text: 'AI Check currently unavailable.' });
    } finally {
      setIsChecking(false);
    }
  };

const handlePrescribe = async (e) => {
    e.preventDefault();
    if (!medicineName || !dosageForm.amount || !dosageForm.days) return alert('Medicine Name, Amount, and Days are required.');
    
    setIsSubmitting(true);
    let times = [];
    if (dosageForm.morning) times.push('Morning');
    if (dosageForm.afternoon) times.push('Afternoon');
    if (dosageForm.night) times.push('Night');
    const timeStr = times.length > 0 ? `(${times.join(', ')})` : '';    
    
    // UPDATED: Now includes the number of days in the final string!
    const finalDosageString = `${dosageForm.amount} for ${dosageForm.days} days ${timeStr} - ${dosageForm.meal}`.trim();

    try {
     await axios.post('http://localhost:5000/api/doctor/add-prescription', {
  patient_id: patientData.id,
  medicine_name: medicineName,
  dosage: finalDosageString,
  duration_days: Number(dosageForm.days),
  instructions: instructions
}, { headers });
      
      alert('Prescription successfully added to patient record!');
      handleSearch(new Event('submit')); 
      
      setMedicineName('');
      setInstructions('');
      setAiWarning(null); 
      setDosageForm({ amount: '', days: '', morning: false, afternoon: false, night: false, meal: 'After Food' });
    } catch (err) { alert('Failed to add prescription.'); } 
    finally { setIsSubmitting(false); }
  };

  const handleUpdateStatus = async (prescriptionId, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/doctor/update-prescription/${prescriptionId}`, 
        { status: newStatus }, 
        { headers }
      );
      handleSearch(new Event('submit'));
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  return (
    <div className="mt-4 text-start">
      
      {/* Doctor Header Card */}
      <div className="card shadow-sm border-0 rounded-4 mb-4 text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, #2c3e50, #3498db)' }}>
        <div className="card-body p-4 p-md-5 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <p className="mb-1 text-white-50 fw-semibold text-uppercase tracking-wider small">Clinical Portal</p>
            <h2 className="fw-bold mb-0 text-white">Doctor Workspace</h2>
            <p className="mb-0 text-white text-opacity-75">Search patients, review records, and prescribe medication.</p>
          </div>
          <div className="bg-white bg-opacity-10 p-3 rounded-4 border border-white border-opacity-25 text-md-end text-center shadow-sm">
            <span className="d-block small text-white-50 text-uppercase fw-bold mb-2">Search Patient Record</span>
            <form onSubmit={handleSearch} className="d-flex gap-2">
              <input type="text" className="form-control fw-bold text-center rounded-pill" placeholder="e.g., PT-123456" value={searchId} onChange={(e) => setSearchId(e.target.value)} style={{ letterSpacing: '2px', textTransform: 'uppercase' }} />
              <button type="submit" className="btn btn-light rounded-pill fw-bold text-primary px-4">Find</button>
            </form>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger shadow-sm rounded-4 border-0 fw-bold d-flex align-items-center gap-2"><span className="fs-5">⚠️</span> {error}</div>}

      {patientData && (
        <div className="row g-4 animate__animated animate__fadeIn">
          
          {/* LEFT COLUMN: Patient Details, Reports & Medications */}
          <div className="col-lg-5 d-flex flex-column gap-4">
            
            {/* Patient Profile Card */}
            <div className="card shadow-sm border-0 rounded-4 bg-light">
              <div className="card-body p-4">
                <h5 className="fw-bold text-dark mb-4 border-bottom pb-2">Patient Profile</h5>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-muted small fw-bold text-uppercase">Full Name</span>
                  <span className="fw-bold fs-5">{patientData.name}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <span className="text-muted small fw-bold text-uppercase">Unique ID</span>
                  <span className="badge bg-primary rounded-pill px-3 py-2">{patientData.patient_unique_id}</span>
                </div>

                <div className="p-3 rounded-4 border shadow-sm bg-white">
                  <h6 className="fw-bold text-dark d-flex align-items-center gap-2 mb-3"><span className="text-danger">⚠️</span> Safety & Allergies</h6>
                  {patientData.allergies ? (
                    <div className="d-flex flex-wrap gap-2">
                      {patientData.allergies.split(/[\n,]+/).map((allergy, index) => {
                        const trimmed = allergy.trim();
                        if (!trimmed) return null;
                        return <span key={index} className="badge bg-danger text-white px-3 py-2 rounded-pill shadow-sm fw-medium">{trimmed}</span>;
                      })}
                    </div>
                  ) : (
                    <div className="p-2 bg-success bg-opacity-10 border border-success border-opacity-25 rounded-3">
                      <p className="fw-bold text-success mb-0 small">✅ No known allergies recorded.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

           {/* Medication History Module for Doctor */}
            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-body p-4">
                <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">Medication History</h5>
                
                {prescriptions.length === 0 ? (
                  <p className="text-muted small mb-0">No medication history found.</p>
                ) : (
                  <div className="d-flex flex-column gap-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
{prescriptions.map(rx => {
  const status = rx.status?.trim() || '';

  const statusStyles = {
    Active:     { card: 'border-success bg-success bg-opacity-10', text: 'text-success', select: 'bg-success text-white border-success' },
    Dispensed:  { card: 'border-primary bg-primary bg-opacity-10', text: 'text-primary', select: 'bg-primary text-white border-primary' },
    Completed:  { card: 'border-secondary bg-light',               text: 'text-secondary', select: 'bg-secondary text-white border-secondary' },
    Stopped:    { card: 'border-danger bg-danger bg-opacity-10',   text: 'text-danger', select: 'bg-danger text-white border-danger' },
  };

  const style = statusStyles[status] || statusStyles.Completed; // fallback for any unexpected value

  return (
    <div key={rx.id} className={`p-3 rounded-4 border ${style.card}`}>
      <div className="d-flex justify-content-between align-items-start mb-2">
        <h6 className={`fw-bold mb-0 ${style.text}`}>{rx.medicine_name}</h6>
        <select
          className={`form-select form-select-sm w-auto fw-bold ${style.select}`}
          value={rx.status}
          onChange={(e) => handleUpdateStatus(rx.id, e.target.value)}
        >
          <option value="Active">Active</option>
          <option value="Dispensed">Dispensed</option>
          <option value="Completed">Completed</option>
          <option value="Stopped">Stopped</option>
        </select>
      </div>
      <p className="small text-dark mb-2 fw-medium">{rx.dosage}</p>
      <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.75rem' }}>
        <span>Dr. {rx.doctor_name}</span>
        <span>{new Date(rx.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
})}
                  </div>
                )}
              </div>
            </div>

            {/* Lab Reports Card */}
            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-body p-4">
                <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">Lab Reports</h5>
                {reports.length === 0 ? (
                  <p className="text-muted small mb-0">No lab reports found.</p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {reports.map(report => (
                      <div key={report.id} className="d-flex justify-content-between align-items-center p-2 bg-light rounded-3 border">
                        <div className="text-truncate px-2">
                          <h6 className="mb-0 fw-bold text-dark text-truncate small">{report.file_name}</h6>
                          <small className="text-muted" style={{ fontSize: '0.75rem' }}>{new Date(report.uploaded_at).toLocaleDateString()}</small>
                        </div>
                        <a href={`http://localhost:5000/uploads/${report.file_path}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary rounded-pill flex-shrink-0">View</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: E-Prescription Pad */}
          <div className="col-lg-7">
            <div className="card shadow-sm border-0 rounded-4 h-100 position-sticky" style={{ top: '20px' }}>
              <div className="bg-primary rounded-top-4" style={{ height: '6px' }}></div>
              <div className="card-body p-4 p-xl-5">
                <div className="d-flex align-items-center gap-3 mb-4 border-bottom pb-3">
                  <div className="bg-primary bg-opacity-10 p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}><span className="fs-4">✍️</span></div>
                  <div>
                    <h4 className="fw-bold text-dark mb-0">E-Prescription Pad</h4>
                    <p className="text-muted small mb-0">Issue secure digital medication directly to patient file.</p>
                  </div>
                </div>

                <form onSubmit={handlePrescribe}>
                  
                  {/* UPGRADED: AI Input Group for Medicine Name */}
                  <div className="mb-4">
                    <label className="form-label fw-bold text-dark">Medicine Name *</label>
                    <div className="input-group">
                      <input 
                        type="text" 
                        className="form-control form-control-lg bg-light border-0 shadow-sm" 
                        placeholder="e.g., Amoxicillin 500mg" 
                        value={medicineName} 
                        onChange={(e) => {
                          setMedicineName(e.target.value);
                          setAiWarning(null); 
                        }} 
                        required 
                      />
                      <button 
                        type="button" 
                        className="btn btn-dark fw-bold px-4" 
                        onClick={handleCheckInteraction}
                        disabled={isChecking || !medicineName}
                      >
                        {isChecking ? 'Checking...' : 'AI Safety Check'}
                      </button>
                    </div>
                    {aiWarning && (
                      <div className={`alert alert-${aiWarning.type} mt-2 py-2 small fw-bold shadow-sm animate__animated animate__headShake`}>
                        {aiWarning.text}
                      </div>
                    )}
                  </div>
                  
                 <div className="mb-4 bg-light p-3 rounded-4 border">
    <label className="form-label fw-bold text-dark mb-3">Routine & Dosage *</label>
    
    {/* 🔥 The Fix: Side-by-side inputs for Amount and Days */}
    <div className="d-flex gap-2 mb-3">
        <input 
            type="text" 
            className="form-control border-0 shadow-sm" 
            placeholder="Amount (e.g., 1 Tablet)" 
            value={dosageForm.amount} 
            onChange={(e) => setDosageForm({...dosageForm, amount: e.target.value})} 
            required 
        />
        <input 
            type="number" 
            className="form-control border-0 shadow-sm" 
            placeholder="No. of Days" 
            value={dosageForm.days} 
            onChange={(e) => setDosageForm({...dosageForm, days: e.target.value})} 
            required 
            min="1"
        />
    </div>

    <div className="btn-group w-100 mb-3 shadow-sm" role="group">
                      <input type="checkbox" className="btn-check" id="btnMorning" checked={dosageForm.morning} onChange={(e) => setDosageForm({...dosageForm, morning: e.target.checked})} />
                      <label className="btn btn-outline-primary" htmlFor="btnMorning">🌅 Morning</label>
                      <input type="checkbox" className="btn-check" id="btnAfternoon" checked={dosageForm.afternoon} onChange={(e) => setDosageForm({...dosageForm, afternoon: e.target.checked})} />
                      <label className="btn btn-outline-primary" htmlFor="btnAfternoon">☀️ Afternoon</label>
                      <input type="checkbox" className="btn-check" id="btnNight" checked={dosageForm.night} onChange={(e) => setDosageForm({...dosageForm, night: e.target.checked})} />
                      <label className="btn btn-outline-primary" htmlFor="btnNight">🌙 Night</label>
                    </div>
                    <div className="btn-group w-100 shadow-sm" role="group">
                      <input type="radio" className="btn-check" id="btnBeforeFood" checked={dosageForm.meal === 'Before Food'} onChange={() => setDosageForm({...dosageForm, meal: 'Before Food'})} />
                      <label className="btn btn-outline-success" htmlFor="btnBeforeFood">🍽️ Before Food</label>
                      <input type="radio" className="btn-check" id="btnAfterFood" checked={dosageForm.meal === 'After Food'} onChange={() => setDosageForm({...dosageForm, meal: 'After Food'})} />
                      <label className="btn btn-outline-success" htmlFor="btnAfterFood">🍽️ After Food</label>
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="form-label fw-bold text-dark">Additional Clinical Notes (Optional)</label>
                    <textarea className="form-control bg-light border-0 shadow-sm rounded-3 p-3" rows="2" placeholder="e.g., Drink plenty of water." value={instructions} onChange={(e) => setInstructions(e.target.value)}></textarea>
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg w-100 fw-bold rounded-pill shadow-sm" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing & Saving...' : 'Sign & Issue Prescription'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default DoctorDashboard;