import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000';
const RECENT_KEY = 'mx_pharmacist_recent_patients';
const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

// ---------- small helpers ----------
const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';

const parseDate = (d) => {
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (d) => {
  const date = parseDate(d);
  return date ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
};

const timeAgo = (d) => {
  const date = parseDate(d);
  if (!date) return '';
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months} month${months > 1 ? 's' : ''} ago` : `${Math.floor(months / 12)} yr ago`;
};

const loadRecent = () => {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const saveRecent = (entry) => {
  try {
    const next = [entry, ...loadRecent().filter(r => r.id !== entry.id)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable – recent list is just a convenience */
  }
};

// ---------- 6-box one-time-code input (supports paste + backspace) ----------
function OtpInput({ value, onChange, disabled }) {
  const refs = useRef([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] || '');

  const focusAt = (i) => refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, i))]?.focus();

  const handleChange = (i, raw) => {
    const clean = raw.replace(/\D/g, '');
    if (!clean) return;
    const next = digits.slice();
    // typing (or autofill) can deliver several digits at once – spread them out
    clean.split('').forEach((ch, k) => { if (i + k < OTP_LENGTH) next[i + k] = ch; });
    onChange(next.join(''));
    focusAt(i + clean.length);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = digits.slice();
      if (next[i]) {
        next[i] = '';
        onChange(next.join(''));
      } else if (i > 0) {
        next[i - 1] = '';
        onChange(next.join(''));
        focusAt(i - 1);
      }
    } else if (e.key === 'ArrowLeft') focusAt(i - 1);
    else if (e.key === 'ArrowRight') focusAt(i + 1);
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    focusAt(pasted.length);
  };

  return (
    <div className="ph-otp" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className={d ? 'filled' : ''}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={OTP_LENGTH}
          value={d}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}

function PharmacistDashboard() {
  const [step, setStep] = useState(1); // 1: Enter ID, 2: Enter OTP, 3: View Records

  const [uniqueId, setUniqueId] = useState('');
  const [patientId, setPatientId] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [otp, setOtp] = useState('');

  const [allergies, setAllergies] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentPatients, setRecentPatients] = useState(loadRecent);
  const [cooldown, setCooldown] = useState(0);

  // tracks which prescription's dispense form is open, and its field values
  const [dispensingId, setDispensingId] = useState(null);
  const [medicinesGiven, setMedicinesGiven] = useState('');
  const [daysSupplied, setDaysSupplied] = useState('');
  const [isDispensing, setIsDispensing] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // resend-code countdown
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // STEP 1: Request Access (sends OTP e-mail to the patient)
  const requestAccess = async (idToUse) => {
    setMessage(null);
    setIsLoading(true);
    const sanitizedId = idToUse.trim();
    try {
      const res = await axios.post(`${API}/api/pharmacist/request-access`, { unique_id: sanitizedId }, { headers });
      setUniqueId(sanitizedId);
      setPatientId(res.data.patient_id);
      setPatientName(res.data.patient_name);
      setOtp('');
      setCooldown(RESEND_SECONDS);
      setMessage({ type: 'success', text: `Code sent to ${res.data.patient_name}'s registered email.` });
      setStep(2);
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Patient not found.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestAccess = (e) => {
    e.preventDefault();
    requestAccess(uniqueId);
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== OTP_LENGTH) {
      setMessage({ type: 'danger', text: `Please enter all ${OTP_LENGTH} digits of the code.` });
      return;
    }
    setMessage(null);
    setIsLoading(true);

    try {
      const res = await axios.post(`${API}/api/pharmacist/verify-access`, { patient_id: patientId, otp }, { headers });
      setAllergies(res.data.allergies || '');
      setPrescriptions(res.data.prescriptions || []);
      setPurchases(res.data.purchases || []);
      saveRecent({ id: uniqueId, name: patientName, at: new Date().toISOString() });
      setRecentPatients(loadRecent());
      setStep(3);
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Invalid or expired code.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Open the inline dispense form for a specific prescription
  const openDispenseForm = (rx) => {
    setDispensingId(rx.id);
    setMedicinesGiven(rx.medicine_name); // pre-filled, editable
    setDaysSupplied(rx.duration_days ? String(rx.duration_days) : ''); // default to what the doctor prescribed
    setMessage(null);
  };

  const cancelDispenseForm = () => {
    setDispensingId(null);
    setMedicinesGiven('');
    setDaysSupplied('');
  };

  // STEP 3: Mark Dispensed — sends medicines_given & days_supplied
  const handleMarkDispensed = async (rx) => {
    if (!daysSupplied || Number(daysSupplied) < 1) {
      setMessage({ type: 'danger', text: 'Please enter how many days of medicine you are supplying.' });
      return;
    }

    setIsDispensing(true);
    try {
      await axios.put(
        `${API}/api/pharmacist/mark-dispensed/${rx.id}`,
        { medicines_given: medicinesGiven, days_supplied: Number(daysSupplied) },
        { headers }
      );

      setPrescriptions(prev => prev.filter(p => p.id !== rx.id));
      // show it straight away in "Recently bought medicines"
      setPurchases(prev => [{
        id: `new-${rx.id}`,
        medicines_given: medicinesGiven,
        days_supplied: Number(daysSupplied),
        dispensed_at: new Date().toISOString(),
        medicine_name: rx.medicine_name,
        dosage: rx.dosage,
        status: 'Dispensed',
        doctor_name: rx.doctor_name,
      }, ...prev]);
      cancelDispenseForm();
      setMessage({ type: 'success', text: `${medicinesGiven || rx.medicine_name} marked as dispensed.` });
    } catch {
      setMessage({ type: 'danger', text: 'Failed to update status. Please try again.' });
    } finally {
      setIsDispensing(false);
    }
  };

  const resetSearch = () => {
    setStep(1);
    setUniqueId('');
    setOtp('');
    setPatientId(null);
    setPatientName('');
    setPrescriptions([]);
    setPurchases([]);
    setAllergies('');
    setMessage(null);
    setCooldown(0);
    cancelDispenseForm();
  };

  const STEPS = [
    { n: 1, t: 'Patient ID', s: 'Find the patient' },
    { n: 2, t: 'Verify code', s: 'Patient shares OTP' },
    { n: 3, t: 'Dispense', s: 'Records & medicines' },
  ];

  // "Penicillin, Sulfa drugs" -> ["Penicillin", "Sulfa drugs"] so each allergy is easy to scan
  const allergyList = (allergies || '').split(/[,;\n]+/).map(a => a.trim()).filter(Boolean);

  const alertBox = message && (
    <div className={`mx-alert ${message.type}`} role="alert">
      <span>{message.type === 'success' ? '✅' : '⚠️'}</span><span>{message.text}</span>
    </div>
  );

  return (
    <div className="mx-container text-start">
      <div className="mx-hero fade-in">
        <div className="eyebrow">Pharmacy portal</div>
        <h2>Dispensing portal</h2>
        <p className="sub">Verify the patient with a one-time code, check allergies and recent purchases, then dispense. A course only counts as completed after you have dispensed it.</p>
      </div>

      {/* Progress */}
      <div className="ph-steps" aria-label="Progress">
        {STEPS.map((s, i) => (
          <div key={s.n} style={{ display: 'contents' }}>
            <div className={`ph-step ${step === s.n ? 'on' : ''} ${step > s.n ? 'done' : ''}`}>
              <span className="dot">{step > s.n ? '✓' : s.n}</span>
              <span className="tx">{s.t}<small>{s.s}</small></span>
            </div>
            {i < STEPS.length - 1 && <span className={`ph-step-line ${step > s.n ? 'done' : ''}`} />}
          </div>
        ))}
      </div>

      {/* ============ STEP 1 ============ */}
      {step === 1 && (
        <div className="ph-start fade-in">
          <div className="mx-card ph-form-card">
            <div className="ico-top" aria-hidden="true">🔎</div>
            <h3>Find a patient</h3>
            <p className="lead">Enter the patient's unique ID. We'll email a secure 6-digit code to the patient.</p>

            {alertBox}

            <form onSubmit={handleRequestAccess}>
              <div className="mx-field">
                <label className="mx-label" htmlFor="pid">Patient ID</label>
                <input id="pid" type="text" className="mx-input ph-idinput" placeholder="e.g. PT-AB12CD" value={uniqueId} onChange={(e) => setUniqueId(e.target.value)} autoComplete="off" required />
                <div className="mx-hint">The ID is shown on the patient's Medinex dashboard.</div>
              </div>
              <button type="submit" className="mx-btn mx-btn-primary mx-btn-block mx-btn-lg" disabled={isLoading || !uniqueId.trim()}>
                {isLoading ? 'Sending code…' : 'Send access code →'}
              </button>
            </form>
          </div>

          <div className="ph-side">
            <div className="mx-card ph-info">
              <h4>📋 How it works</h4>
              <ol className="ph-how">
                <li><span className="n">1</span><div><b>Enter the patient ID</b><span>We email a one-time code to the patient.</span></div></li>
                <li><span className="n">2</span><div><b>Ask the patient for the code</b><span>This proves they are present and consent to share records.</span></div></li>
                <li><span className="n">3</span><div><b>Review &amp; dispense</b><span>See allergies, recent purchases and active prescriptions.</span></div></li>
              </ol>
            </div>

            {recentPatients.length > 0 && (
              <div className="mx-card ph-info">
                <h4>🕘 Recently served patients</h4>
                <div className="ph-recent">
                  {recentPatients.map(r => (
                    <button key={r.id} type="button" className="ph-recent-btn" onClick={() => requestAccess(r.id)} disabled={isLoading} title="Send a new code to this patient">
                      <span className="mx-avatar" style={{ width: 40, height: 40, fontSize: '.9rem' }}>{initials(r.name)}</span>
                      <span><div className="nm">{r.name}</div><div className="id">{r.id}</div></span>
                      <span className="when">{timeAgo(r.at)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="ph-secure">
              <span className="ico" aria-hidden="true">🔒</span>
              <span>Records stay locked until the patient shares their code. The code expires after 10 minutes and works only once.</span>
            </div>
          </div>
        </div>
      )}

      {/* ============ STEP 2 ============ */}
      {step === 2 && (
        <div className="mx-card ph-form-card ph-verify-card fade-in">
          <div className="ico-top" aria-hidden="true">🔐</div>
          <h3>Enter the access code</h3>
          <p className="lead">We emailed a 6-digit code to <strong>{patientName}</strong>. Ask the patient to read it out to you.</p>

          {alertBox}

          <form onSubmit={handleVerifyOtp}>
            <OtpInput value={otp} onChange={setOtp} disabled={isLoading} />
            <button type="submit" className="mx-btn mx-btn-primary mx-btn-block mx-btn-lg" disabled={isLoading || otp.length !== OTP_LENGTH}>
              {isLoading ? 'Verifying…' : 'Unlock records'}
            </button>
          </form>

          <div className="ph-resend">
            <button type="button" className="mx-btn mx-btn-link" onClick={resetSearch}>← Use a different ID</button>
            <button type="button" className="mx-btn mx-btn-link" onClick={() => requestAccess(uniqueId)} disabled={cooldown > 0 || isLoading}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </div>
      )}

      {/* ============ STEP 3 ============ */}
      {step === 3 && (
        <div className="ph-work fade-in">
          {/* Patient summary */}
          <aside className="mx-card ph-patient">
            <div className="av" aria-hidden="true">{initials(patientName)}</div>
            <h3>{patientName}</h3>
            <span className="mx-code-tag">{uniqueId}</span>
            <div><span className="ph-verified">✓ Identity verified</span></div>

            <div className="ph-kv">
              <div><b>{prescriptions.length}</b><span>To dispense</span></div>
              <div><b>{purchases.length}</b><span>Past purchases</span></div>
            </div>

            {allergyList.length > 0 ? (
              <div className="ph-allergy has">
                <div className="ph-allergy-head"><span aria-hidden="true">⚠️</span><b>Known allergies</b></div>
                <ul className="ph-allergy-list">
                  {allergyList.map(a => <li key={a}>{a}</li>)}
                </ul>
              </div>
            ) : (
              <div className="ph-allergy none">
                <div className="ph-allergy-head"><span aria-hidden="true">✓</span><b>Allergies</b></div>
                <div className="ph-allergy-empty">No known allergies recorded.</div>
              </div>
            )}

            <button onClick={resetSearch} className="mx-btn mx-btn-ghost-dark mx-btn-block">Serve another patient</button>
          </aside>

          <div>
            {alertBox}

            {/* Active prescriptions */}
            <section className="ph-section">
              <div className="ph-section-head">
                <h4>💊 To dispense <span className="ph-count">{prescriptions.length}</span></h4>
              </div>

              {prescriptions.length === 0 ? (
                <div className="mx-empty">
                  <span className="big">✅</span>
                  <strong>Nothing left to dispense</strong>
                  This patient has no active prescriptions waiting.
                </div>
              ) : prescriptions.map(rx => (
                <div key={rx.id} className="ph-rx">
                  <div className="ph-rx-top">
                    <div>
                      <h5>{rx.medicine_name}</h5>
                      <div className="dose">{rx.dosage}</div>
                      {rx.instructions && <div className="inst">{rx.instructions}</div>}
                    </div>
                    {dispensingId !== rx.id && (
                      <button className="mx-btn mx-btn-success" onClick={() => openDispenseForm(rx)}>Mark dispensed</button>
                    )}
                  </div>

                  <div className="ph-meta">
                    <span>👨‍⚕️ Dr. {rx.doctor_name}</span>
                    {rx.duration_days ? <span>🗓️ {rx.duration_days} day course</span> : null}
                    {rx.created_at ? <span>Prescribed {formatDate(rx.created_at)}</span> : null}
                  </div>

                  {dispensingId === rx.id && (
                    <div className="ph-dispense">
                      <div>
                        <label className="mx-label" htmlFor={`mg-${rx.id}`}>Medicines given</label>
                        <input id={`mg-${rx.id}`} type="text" className="mx-input" value={medicinesGiven} onChange={(e) => setMedicinesGiven(e.target.value)} />
                      </div>
                      <div>
                        <label className="mx-label" htmlFor={`ds-${rx.id}`}>Days supplied</label>
                        <input id={`ds-${rx.id}`} type="number" min="1" className="mx-input" placeholder="e.g. 5" value={daysSupplied} onChange={(e) => setDaysSupplied(e.target.value)} />
                      </div>
                      <div className="actions">
                        <button className="mx-btn mx-btn-ghost-dark" onClick={cancelDispenseForm} disabled={isDispensing}>Cancel</button>
                        <button className="mx-btn mx-btn-success" onClick={() => handleMarkDispensed(rx)} disabled={isDispensing}>
                          {isDispensing ? 'Saving…' : 'Confirm dispense'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </section>

            {/* Recently bought medicines */}
            <section className="ph-section">
              <div className="ph-section-head">
                <h4>🧾 Recently bought medicines <span className="ph-count soft">{purchases.length}</span></h4>
              </div>

              <div className="ph-history">
                {purchases.length === 0 ? (
                  <div className="ph-history-empty">
                    <span className="big">🛍️</span>
                    <strong>No purchases yet</strong>
                    <div>Medicines you dispense to this patient will be listed here.</div>
                  </div>
                ) : purchases.map(p => {
                  const completed = p.status === 'Completed';
                  return (
                    <div key={p.id} className={`ph-buy ${completed ? 'done' : ''}`}>
                      <div className="pill-ico" aria-hidden="true">{completed ? '✅' : '💊'}</div>
                      <div>
                        <h6>{p.medicines_given || p.medicine_name}</h6>
                        <div className="sub">
                          {p.dosage ? `${p.dosage} · ` : ''}{p.days_supplied ? `${p.days_supplied} day${Number(p.days_supplied) > 1 ? 's' : ''} supplied` : 'Supply not recorded'}
                        </div>
                        <div className="sub">Prescribed by Dr. {p.doctor_name}{p.pharmacist_name ? ` · dispensed by ${p.pharmacist_name}` : ''}</div>
                      </div>
                      <div className="when">
                        <b>{formatDate(p.dispensed_at)}</b>
                        <span className={`mx-pill ${completed ? 'Completed' : 'Dispensed'}`}>{completed ? 'Course completed' : 'In use'}</span>
                        <div style={{ marginTop: 6 }}>{timeAgo(p.dispensed_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

export default PharmacistDashboard;
