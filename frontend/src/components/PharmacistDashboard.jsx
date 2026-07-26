import { useState } from 'react';
import axios from 'axios';

function PharmacistDashboard() {
  const [step, setStep] = useState(1); // 1: Enter ID, 2: Enter OTP, 3: View Records

  const [uniqueId, setUniqueId] = useState('');
  const [patientId, setPatientId] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [otp, setOtp] = useState('');

  const [allergies, setAllergies] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // NEW: tracks which prescription's dispense form is open, and its field values
  const [dispensingId, setDispensingId] = useState(null);
  const [medicinesGiven, setMedicinesGiven] = useState('');
  const [daysSupplied, setDaysSupplied] = useState('');
  const [isDispensing, setIsDispensing] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // STEP 1: Request Access (Sends Email to Patient)
  const handleRequestAccess = async (e) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const sanitizedId = uniqueId.trim();

    try {
      const res = await axios.post('http://localhost:5000/api/pharmacist/request-access',
        { unique_id: sanitizedId },
        { headers }
      );
      setPatientId(res.data.patient_id);
      setPatientName(res.data.patient_name);
      setMessage({ type: 'success', text: res.data.message });
      setStep(2);
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Patient not found.' });
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/pharmacist/verify-access',
        { patient_id: patientId, otp },
        { headers }
      );
      setAllergies(res.data.allergies);
      setPrescriptions(res.data.prescriptions);
      setStep(3);
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Invalid or expired code.' });
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Open the inline dispense form for a specific prescription
  const openDispenseForm = (rx) => {
    setDispensingId(rx.id);
    setMedicinesGiven(rx.medicine_name); // pre-filled, editable
    setDaysSupplied('');
  };

  const cancelDispenseForm = () => {
    setDispensingId(null);
    setMedicinesGiven('');
    setDaysSupplied('');
  };

  // STEP 3: Mark Dispensed — now sends medicines_given & days_supplied
  const handleMarkDispensed = async (prescriptionId) => {
    if (!daysSupplied) {
      alert('Please enter days supplied.');
      return;
    }

    setIsDispensing(true);
    try {
      await axios.put(
        `http://localhost:5000/api/pharmacist/mark-dispensed/${prescriptionId}`,
        {
          medicines_given: medicinesGiven,
          days_supplied: Number(daysSupplied),
        },
        { headers }
      );

      setPrescriptions(prevPrescriptions => prevPrescriptions.filter(rx => rx.id !== prescriptionId));
      cancelDispenseForm();
    } catch (err) {
      alert('Failed to update status.');
    } finally {
      setIsDispensing(false);
    }
  };

  const resetSearch = () => {
    setStep(1);
    setUniqueId('');
    setOtp('');
    setPatientId(null);
    setPrescriptions([]);
    setMessage(null);
    cancelDispenseForm();
  };

  return (
    <div className="mt-4 text-start">
      <h3 className="fw-bold text-info mb-4">Pharmacy Dispensing Portal</h3>

      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-sm border-0 rounded-4">
            <div className="card-body p-5">

              {message && <div className={`alert alert-${message.type} py-2`}>{message.text}</div>}

              {/* STEP 1: Search Patient ID */}
              {step === 1 && (
                <form onSubmit={handleRequestAccess}>
                  <h5 className="fw-bold mb-3 text-center">Request Patient Access</h5>
                  <p className="text-muted small text-center mb-4">Enter the patient's Unique ID to send a secure verification code to their email.</p>
                  <div className="mb-4">
                    <input type="text" className="form-control form-control-lg bg-light text-center fw-bold" placeholder="PT-XXXXXX" value={uniqueId} onChange={(e) => setUniqueId(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-info w-100 rounded-pill fw-bold text-white shadow-sm" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Access Code'}
                  </button>
                </form>
              )}

              {/* STEP 2: Enter OTP */}
              {step === 2 && (
                <form onSubmit={handleVerifyOtp}>
                  <h5 className="fw-bold mb-3 text-center">Verify Access</h5>
                  <p className="text-muted small text-center mb-4">An access code has been sent to <strong>{patientName}</strong>. Please ask the patient for the code.</p>
                  <div className="mb-4">
                    <input type="text" className="form-control form-control-lg bg-light text-center fw-bold tracking-widest" placeholder="6-Digit Code" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-success w-100 rounded-pill fw-bold shadow-sm" disabled={isLoading}>
                    {isLoading ? 'Verifying...' : 'Unlock Prescriptions'}
                  </button>
                  <button type="button" className="btn btn-link w-100 mt-2 text-muted text-decoration-none small" onClick={resetSearch}>Cancel</button>
                </form>
              )}

              {/* STEP 3: View Prescriptions & Allergies */}
              {step === 3 && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
                    <div>
                      <h5 className="fw-bold mb-0 text-dark">{patientName}</h5>
                      <span className="text-muted small">ID: {uniqueId}</span>
                    </div>
                    <button onClick={resetSearch} className="btn btn-sm btn-outline-secondary rounded-pill px-3">New Patient</button>
                  </div>

                  {allergies ? (
                    <div className="alert alert-danger py-2 mb-4 d-flex align-items-center gap-2">
                      <strong>⚠️ Known Allergies:</strong> {allergies}
                    </div>
                  ) : (
                    <div className="alert alert-secondary py-2 mb-4">No known allergies recorded.</div>
                  )}

                  <h6 className="fw-bold text-success mb-3">Active Prescriptions to Dispense</h6>

                  {prescriptions.length === 0 ? (
                    <div className="text-center p-4 bg-light rounded-4 text-muted small border border-dashed">
                      No active prescriptions to dispense.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {prescriptions.map(rx => (
                        <div key={rx.id} className="card border-success border-opacity-25 bg-success bg-opacity-10 rounded-3 shadow-sm">
                          <div className="card-body p-3">
                            <h5 className="fw-bold text-success mb-1">{rx.medicine_name}</h5>
                            <p className="mb-1 text-dark fw-semibold">{rx.dosage}</p>
                            <p className="mb-2 text-muted small">{rx.instructions}</p>
                            <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top border-success border-opacity-25">
                              <span className="small text-muted">Dr. {rx.doctor_name}</span>
                              {dispensingId !== rx.id && (
                                <button
                                  className="btn btn-sm btn-success rounded-pill px-3 fw-bold"
                                  onClick={() => openDispenseForm(rx)}
                                >
                                  Mark Dispensed
                                </button>
                              )}
                            </div>

                            {/* NEW: inline dispense form, replaces window.prompt */}
                            {dispensingId === rx.id && (
                              <div className="mt-3 pt-3 border-top border-success border-opacity-25">
                                <div className="mb-2">
                                  <label className="form-label small fw-semibold mb-1">Medicines given</label>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={medicinesGiven}
                                    onChange={(e) => setMedicinesGiven(e.target.value)}
                                  />
                                </div>
                                <div className="mb-3">
                                  <label className="form-label small fw-semibold mb-1">Days supplied</label>
                                  <input
                                    type="number"
                                    min="1"
                                    className="form-control form-control-sm"
                                    placeholder="e.g. 5"
                                    value={daysSupplied}
                                    onChange={(e) => setDaysSupplied(e.target.value)}
                                  />
                                </div>
                                <div className="d-flex gap-2 justify-content-end">
                                  <button
                                    className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                                    onClick={cancelDispenseForm}
                                    disabled={isDispensing}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="btn btn-sm btn-success rounded-pill px-3 fw-bold"
                                    onClick={() => handleMarkDispensed(rx.id)}
                                    disabled={isDispensing}
                                  >
                                    {isDispensing ? 'Saving...' : 'Confirm Dispense'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PharmacistDashboard;