import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import ReportCard from './ReportCard';

const API = 'http://localhost:5000/api/patient';

/* ---------- helpers ---------- */
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const prettyDate = (d) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const shortDate = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const initials = (n = '') => n.replace(/^dr\.?\s*/i, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'DR';
const docLabel = (n = '') => (/^dr\.?\s/i.test(n) ? n : `Dr. ${n}`);

// Group a list by two levels. Returns [{key, label, items:[{key,label,items}]}] (newest first)
function groupTwoLevel(list, mode) {
  const first = new Map();
  list.forEach(rx => {
    const k1 = mode === 'date' ? dayKey(rx.created_at) : String(rx.doctor_id);
    const k2 = mode === 'date' ? String(rx.doctor_id) : dayKey(rx.created_at);
    if (!first.has(k1)) first.set(k1, { key: k1, sample: rx, second: new Map() });
    const g = first.get(k1);
    if (!g.second.has(k2)) g.second.set(k2, { key: k2, sample: rx, items: [] });
    g.second.get(k2).items.push(rx);
  });
  return [...first.values()]
    .map(g => ({
      key: g.key,
      label: mode === 'date' ? prettyDate(g.sample.created_at) : docLabel(g.sample.doctor_name),
      count: [...g.second.values()].reduce((n, s) => n + s.items.length, 0),
      latest: Math.max(...[...g.second.values()].flatMap(s => s.items.map(i => +new Date(i.created_at)))),
      items: [...g.second.values()]
        .map(s => ({ key: s.key, label: mode === 'date' ? docLabel(s.sample.doctor_name) : prettyDate(s.sample.created_at), doctor: s.sample.doctor_name, items: s.items, ts: +new Date(s.sample.created_at) }))
        .sort((a, b) => (mode === 'date' ? a.label.localeCompare(b.label) : b.ts - a.ts))
    }))
    .sort((a, b) => b.latest - a.latest);
}

// When will a dispensed course end?
function courseEnd(rx) {
  if (rx.status !== 'Dispensed' || !rx.dispensed_at) return null;
  const days = rx.days_supplied ?? rx.duration_days;
  if (!days) return null;
  const d = new Date(rx.dispensed_at);
  d.setDate(d.getDate() + Number(days));
  return d;
}

const STATUS_TEXT = {
  Active: 'Prescribed — waiting to be collected from the pharmacy',
  Dispensed: 'Collected from pharmacy — currently taking',
  Completed: 'Course completed',
  Stopped: 'Stopped early by your doctor'
};
const STATUS_LABEL = { Active: 'Awaiting pickup', Dispensed: 'Taking now', Completed: 'Completed', Stopped: 'Stopped' };

/* ---------- small pieces ---------- */
function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`mx-toast ${toast.type}`} role="status">{toast.text}</div>;
}

function RxRow({ rx, onReport, canReport }) {
  const end = courseEnd(rx);
  return (
    <div className="mx-rx">
      <div style={{ minWidth: 0 }}>
        <h5>{rx.medicine_name}</h5>
        <div className="dose">{rx.dosage}</div>
        {rx.instructions && <div className="note">📝 {rx.instructions}</div>}
        <div className="hint">
          {rx.status === 'Dispensed' && rx.dispensed_at
            ? <>Collected {shortDate(rx.dispensed_at)}{end && <> · finishes <strong>{shortDate(end)}</strong></>}</>
            : STATUS_TEXT[rx.status]}
        </div>
      </div>
      <div className="text-end d-flex flex-column align-items-end gap-2 flex-shrink-0">
        <span className={`mx-pill ${rx.status}`}>{STATUS_LABEL[rx.status] || rx.status}</span>
        {canReport && (
          <button className="btn btn-link btn-sm p-0 text-danger fw-semibold text-decoration-none" style={{ fontSize: '.76rem' }} onClick={() => onReport(rx)}>
            ⚑ Report an issue
          </button>
        )}
      </div>
    </div>
  );
}

function GroupedPrescriptions({ list, mode, onReport }) {
  const groups = useMemo(() => groupTwoLevel(list, mode), [list, mode]);
  if (!groups.length) return <div className="mx-empty"><span className="big">💊</span>Nothing here yet.</div>;
  return groups.map(g => (
    <div className="mx-group fade-in" key={g.key}>
      <span className="mx-group-dot" />
      <div className="mx-group-head">
        <h4>{g.label}</h4>
        <span className="meta">{g.count} medicine{g.count > 1 ? 's' : ''}</span>
      </div>
      {g.items.map(sub => (
        <div className="mx-sub-group" key={sub.key}>
          <div className="mx-doc-line">
            {mode === 'date'
              ? <><span className="mx-avatar">{initials(sub.doctor)}</span>{sub.label}</>
              : <><span aria-hidden>📅</span>{sub.label}</>}
          </div>
          {sub.items.map(rx => <RxRow key={rx.id} rx={rx} onReport={onReport} canReport />)}
        </div>
      ))}
    </div>
  ));
}

/* ---------- main ---------- */
function PatientDashboard() {
  const [profile, setProfile] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingRx, setLoadingRx] = useState(true);
  const [reports, setReports] = useState([]);
  const [myComplaints, setMyComplaints] = useState([]);

  const [activeTab, setActiveTab] = useState('prescriptions');
  const [groupMode, setGroupMode] = useState('date');      // 'date' | 'doctor'
  const [rxFilter, setRxFilter] = useState('all');         // all | current | history

  const [allergiesInput, setAllergiesInput] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedSummary, setUploadedSummary] = useState(null);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);

  // Complaint form -- hospital & doctor come from the chosen prescription automatically
  const [selectedRx, setSelectedRx] = useState(null);
  const [complaintText, setComplaintText] = useState('');
  const [complaintStatus, setComplaintStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Chatbot
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { sender: 'ai', text: 'Hello! I am your Medinex AI Assistant. Ask me how to store your medicines, what side effects to look out for, or general wellness tips.' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEnd = useRef(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const notify = (type, text) => { setToast({ type, text }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, isChatLoading]);

  const fetchProfile = async () => {
    try { const r = await axios.get(`${API}/profile`, { headers }); setProfile(r.data); setAllergiesInput(r.data.allergies || ''); } catch (e) { console.error(e); }
  };
  const fetchPrescriptions = async () => {
    try { const r = await axios.get(`${API}/prescriptions`, { headers }); setPrescriptions(r.data); } catch (e) { console.error(e); } finally { setLoadingRx(false); }
  };
  const fetchReports = async () => { try { const r = await axios.get(`${API}/reports`, { headers }); setReports(r.data); } catch (e) { console.error(e); } };
  const fetchMyComplaints = async () => { try { const r = await axios.get(`${API}/my-complaints`, { headers }); setMyComplaints(r.data); } catch (e) { console.error(e); } };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile(); fetchPrescriptions(); fetchReports(); fetchMyComplaints();
  }, []);

  const handleUpdateAllergies = async (e) => {
    e.preventDefault();
    try { await axios.post(`${API}/allergies`, { allergies: allergiesInput }, { headers }); fetchProfile(); notify('ok', 'Allergies updated'); }
    catch { notify('err', 'Failed to update allergies.'); }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return notify('err', 'Please select a file first.');
    const fd = new FormData(); fd.append('report', file);
    setIsUploading(true); setUploadedSummary(null);
    try {
      const res = await axios.post(`${API}/upload-report`, fd, { headers: { ...headers, 'Content-Type': 'multipart/form-data' } });
      setFile(null);
      const el = document.getElementById('fileUploader'); if (el) el.value = '';
      setUploadedSummary(res.data.summary || null);
      fetchReports();
    } catch { notify('err', 'Upload failed.'); } finally { setIsUploading(false); }
  };

  /* ----- complaint flow ----- */
  const startReport = (rx) => {
    setSelectedRx(rx); setComplaintStatus(null); setActiveTab('complaints');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    setComplaintStatus(null);
    setSubmitting(true);
    try {
      // only the prescription + text are sent; the server finds the doctor & hospital
      const res = await axios.post(`${API}/complaint`, {
        prescription_id: selectedRx.id, complaint_text: complaintText
      }, { headers });
      setComplaintStatus({ type: 'success', text: res.data.message });
      setSelectedRx(null); setComplaintText('');
      fetchMyComplaints();
      notify('ok', 'Complaint submitted');
    } catch (err) {
      setComplaintStatus({ type: 'danger', text: err.response?.data?.message || 'Failed to submit.' });
    } finally { setSubmitting(false); }
  };

  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const q = chatInput;
    const newHistory = [...chatHistory, { sender: 'user', text: q }];
    setChatHistory(newHistory); setChatInput(''); setIsChatLoading(true);
    try {
      const activeMeds = prescriptions.filter(rx => rx.status === 'Active' || rx.status === 'Dispensed').map(rx => rx.medicine_name).join(', ');
      const res = await axios.post(`${API}/ask-ai`, { question: q, patientContext: activeMeds }, { headers });
      setChatHistory([...newHistory, { sender: 'ai', text: res.data.reply }]);
    } catch {
      setChatHistory([...newHistory, { sender: 'ai', text: 'Sorry, I am having trouble connecting to the server. Please ensure the backend is running.' }]);
    } finally { setIsChatLoading(false); }
  };

  const copyId = async () => {
    try { await navigator.clipboard.writeText(profile.patient_unique_id); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  /* ----- derived ----- */
  const counts = useMemo(() => ({
    awaiting: prescriptions.filter(r => r.status === 'Active').length,
    taking: prescriptions.filter(r => r.status === 'Dispensed').length,
    done: prescriptions.filter(r => r.status === 'Completed' || r.status === 'Stopped').length,
    openComplaints: myComplaints.filter(c => c.status !== 'Resolved').length
  }), [prescriptions, myComplaints]);

  const shownRx = prescriptions.filter(r =>
    rxFilter === 'all' ? true : rxFilter === 'current' ? (r.status === 'Active' || r.status === 'Dispensed') : (r.status === 'Completed' || r.status === 'Stopped'));

  const rxByDate = useMemo(() => groupTwoLevel(prescriptions, 'date'), [prescriptions]);

  const canSubmit = selectedRx && selectedRx.hospital_id && complaintText.trim().length >= 10;
  const sidebar = activeTab === 'prescriptions' || activeTab === 'reports';

  return (
    <div className="mx-container text-start">
      <Toast toast={toast} />

      {/* HERO */}
      {profile && (
        <div className="mx-hero fade-in d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="eyebrow">Patient portal</div>
            <h2>Hello, {profile.name.split(' ')[0]} 👋</h2>
            <p className="sub">{profile.email}</p>
          </div>
          <div className="mx-idbadge">
            <small>Your secure ID</small>
            <strong>{profile.patient_unique_id || 'Not assigned'}</strong>
            {profile.patient_unique_id && <div><button onClick={copyId}>{copied ? '✓ Copied' : 'Copy ID'}</button></div>}
          </div>
        </div>
      )}

      {/* STATS */}
      <div className="mx-stats">
        <div className="mx-stat"><div className="ico" style={{ background: '#fffbeb' }}>⏳</div><div><div className="num">{counts.awaiting}</div><div className="lbl">Awaiting pickup</div></div></div>
        <div className="mx-stat"><div className="ico" style={{ background: '#e0f2fe' }}>💊</div><div><div className="num">{counts.taking}</div><div className="lbl">Taking now</div></div></div>
        <div className="mx-stat"><div className="ico" style={{ background: '#ecfdf3' }}>✅</div><div><div className="num">{counts.done}</div><div className="lbl">Completed</div></div></div>
        <div className="mx-stat"><div className="ico" style={{ background: '#fef2f2' }}>⚑</div><div><div className="num">{counts.openComplaints}</div><div className="lbl">Open complaints</div></div></div>
      </div>

      {/* TABS */}
      <div className="mx-tabs" role="tablist">
        {[['prescriptions', '💊 Medical file', prescriptions.length], ['reports', '🧪 Lab reports', reports.length], ['complaints', '⚑ Complaints', myComplaints.length], ['ai-chat', '🤖 AI assistant']].map(([id, label, n]) => (
          <button key={id} role="tab" aria-selected={activeTab === id} className={`mx-tab ${activeTab === id ? 'on' : ''}`} onClick={() => setActiveTab(id)}>
            {label}{n > 0 && <span className="count">{n}</span>}
          </button>
        ))}
      </div>

      <div className="row g-4">
        <div className={sidebar ? 'col-lg-8' : 'col-12'}>

          {/* ===== MEDICAL FILE ===== */}
          {activeTab === 'prescriptions' && (
            <div className="mx-card mx-card-pad fade-in">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                  <h5 className="mx-card-title">Prescriptions</h5>
                  <p className="mx-card-sub mb-0">Organised by when and who prescribed them.</p>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <div className="mx-seg" aria-label="Group by">
                    <button className={groupMode === 'date' ? 'on' : ''} onClick={() => setGroupMode('date')}>📅 By date</button>
                    <button className={groupMode === 'doctor' ? 'on' : ''} onClick={() => setGroupMode('doctor')}>🩺 By doctor</button>
                  </div>
                  <div className="mx-seg" aria-label="Filter">
                    {[['all', 'All'], ['current', 'Current'], ['history', 'History']].map(([k, l]) => (
                      <button key={k} className={rxFilter === k ? 'on' : ''} onClick={() => setRxFilter(k)}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>

              {loadingRx ? (<><div className="mx-skel" /><div className="mx-skel" /></>)
                : <GroupedPrescriptions list={shownRx} mode={groupMode} onReport={startReport} />}
            </div>
          )}

          {/* ===== LAB REPORTS ===== */}
          {activeTab === 'reports' && (
            <div className="d-flex flex-column gap-4 fade-in">
              <div className="mx-card mx-card-pad text-center" style={{ borderStyle: 'dashed' }}>
                <div style={{ fontSize: '2.2rem' }}>📁</div>
                <h5 className="mx-card-title justify-content-center">Upload a lab report</h5>
                <p className="mx-card-sub mx-auto" style={{ maxWidth: 420 }}>Medinex reads the file and writes a plain-language summary for you.</p>
                <form onSubmit={handleFileUpload} className="d-flex flex-column align-items-center">
                  <label htmlFor="fileUploader" className="d-flex align-items-center gap-3 mb-3 text-start w-100" style={{ cursor: 'pointer', maxWidth: 420, background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 14, padding: 14 }}>
                    <span className="fs-4">{file ? '📎' : '⬆️'}</span>
                    <span className="text-truncate">
                      <span className="d-block fw-bold small text-truncate">{file ? file.name : 'Choose a file to upload'}</span>
                      <span className="d-block text-muted" style={{ fontSize: '.75rem' }}>{file ? `${(file.size / 1024).toFixed(0)} KB · ready` : 'PDF, JPG or PNG'}</span>
                    </span>
                  </label>
                  <input type="file" className="d-none" id="fileUploader" onChange={(e) => { setFile(e.target.files[0]); setUploadedSummary(null); }} accept=".pdf,.jpg,.jpeg,.png" />
                  <button type="submit" className="mx-btn mx-btn-primary" disabled={isUploading || !file}>
                    {isUploading && <span className="spinner-border spinner-border-sm" />}
                    {isUploading ? 'Reading document…' : 'Save to profile'}
                  </button>
                </form>
                {uploadedSummary && (
                  <div className="mx-auto mt-4 text-start" style={{ maxWidth: 520 }}>
                    <ReportCard report={{ file_name: file?.name || reports[0]?.file_name || 'Latest upload', uploaded_at: new Date().toISOString(), summary: uploadedSummary }}
                      fileUrl={reports[0] ? `http://localhost:5000/uploads/${reports[0].file_path}` : '#'} highlight />
                  </div>
                )}
              </div>

              <div className="mx-card mx-card-pad">
                <h5 className="mx-card-title">📚 Document history</h5>
                <p className="mx-card-sub">Everything you've uploaded, newest first.</p>
                {reports.length === 0 ? <div className="mx-empty"><span className="big">🧪</span>No documents uploaded yet.</div> : (
                  <div className="d-flex flex-column gap-3">
                    {reports.map(r => <ReportCard key={r.id} report={r} fileUrl={`http://localhost:5000/uploads/${r.file_path}`} />)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== COMPLAINTS ===== */}
          {activeTab === 'complaints' && (
            <div className="row g-4 fade-in">
              <div className="col-lg-7">
                <div className="mx-card mx-card-pad">
                  <h5 className="mx-card-title">⚑ Report a prescription issue</h5>
                  <p className="mx-card-sub">Complaints are about a specific prescription, so the hospital can see exactly what happened.</p>

                  {complaintStatus && <div className={`mx-alert ${complaintStatus.type}`}>{complaintStatus.text}</div>}

                  {prescriptions.length === 0 ? (
                    <div className="mx-empty"><span className="big">💊</span>You have no prescriptions to complain about yet.</div>
                  ) : (
                    <form onSubmit={handleComplaintSubmit}>
                      {/* 1 — prescription */}
                      <div className={`mx-step ${selectedRx ? 'done' : ''}`}><span className="n">{selectedRx ? '✓' : 1}</span><h6>Which prescription?</h6></div>
                      <div style={{ maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
                        {rxByDate.map(g => (
                          <div key={g.key}>
                            <div className="mx-pick-date">{g.label}</div>
                            {g.items.flatMap(sub => sub.items.map(rx => (
                              <button type="button" key={rx.id} className={`mx-pick ${selectedRx?.id === rx.id ? 'on' : ''}`} onClick={() => { setSelectedRx(rx); setComplaintStatus(null); }}>
                                <span className="radio" />
                                <span className="flex-grow-1" style={{ minWidth: 0 }}>
                                  <span className="t d-block">{rx.medicine_name}</span>
                                  <span className="s d-block">{docLabel(rx.doctor_name)} · {rx.dosage}{rx.hospital_name ? ` · ${rx.hospital_name}` : ''}</span>
                                </span>
                                <span className={`mx-pill ${rx.status}`}>{STATUS_LABEL[rx.status] || rx.status}</span>
                              </button>
                            )))}
                          </div>
                        ))}
                      </div>

                      {/* 2 — filled in automatically from the prescription */}
                      <div className={`mx-step ${selectedRx ? 'done' : ''}`}><span className="n">{selectedRx ? '✓' : 2}</span><h6>Sent to (automatic)</h6></div>
                      {selectedRx ? (
                        <div className="mx-card mx-card-pad" style={{ padding: 16, background: '#f8fafc' }}>
                          <div className="fw-bold">💊 {selectedRx.medicine_name} <span className="text-muted fw-normal">· {selectedRx.dosage}</span></div>
                          <div className="small text-muted mt-1">
                            {docLabel(selectedRx.doctor_name)} · Prescribed {shortDate(selectedRx.created_at)}
                          </div>
                          <div className="mt-2">
                            {selectedRx.hospital_name
                              ? <span className="mx-chip">🏥 {selectedRx.hospital_name}</span>
                              : <span className="small text-danger fw-semibold">⚠️ This doctor isn't linked to a hospital yet, so a complaint can't be sent.</span>}
                          </div>
                          <div className="small text-muted mt-2">The hospital will see this prescription's details along with your complaint.</div>
                        </div>
                      ) : (
                        <div className="mx-hint">Pick a prescription above — its medicine and hospital are filled in for you.</div>
                      )}

                      {/* 4 — details */}
                      <div className="mx-step"><span className="n">3</span><h6>What went wrong?</h6></div>
                      <textarea className="mx-textarea" placeholder="Describe the issue with this prescription — e.g. wrong medicine, wrong dose, an allergy was ignored…" value={complaintText} onChange={(e) => setComplaintText(e.target.value)} maxLength={1000} />
                      <div className="d-flex justify-content-between mx-hint"><span>Minimum 10 characters. Shared only with the hospital.</span><span>{complaintText.length}/1000</span></div>

                      <button type="submit" className="mx-btn mx-btn-danger mx-btn-block mx-btn-lg mt-3" disabled={!canSubmit || submitting}>
                        {submitting ? 'Submitting…' : 'Submit complaint'}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <div className="col-lg-5">
                <h5 className="mx-card-title mb-3">My complaints</h5>
                {myComplaints.length === 0 ? (
                  <div className="mx-empty"><span className="big">🕊️</span>You haven't filed any complaints.</div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {myComplaints.map(c => (
                      <div key={c.id} className="mx-card mx-card-pad fade-in" style={{ padding: 18 }}>
                        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                          <div>
                            <div className="fw-bold">{c.medicine_name || 'Prescription'}</div>
                            <div className="small text-muted">{c.hospital_name} · {docLabel(c.doctor_name)}</div>
                          </div>
                          <span className={`mx-pill ${c.status}`}>{c.status === 'Reviewed' ? 'Under review' : c.status}</span>
                        </div>
                        <p className="small mb-2" style={{ color: 'var(--ink-soft)' }}>{c.complaint_text}</p>
                        <div className="small text-muted">
                          {c.prescribed_on && <>Prescribed {shortDate(c.prescribed_on)} · </>}Filed {shortDate(c.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== AI CHAT ===== */}
          {activeTab === 'ai-chat' && (
            <div className="mx-card overflow-hidden fade-in" style={{ maxWidth: 860, margin: '0 auto' }}>
              <div className="d-flex flex-column" style={{ height: '72vh', minHeight: 560 }}>
                <div className="d-flex align-items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--line)', background: '#f8fafc' }}>
                  <span className="mx-avatar" style={{ width: 44, height: 44, fontSize: '1.3rem' }}>🤖</span>
                  <div><h5 className="mb-0 fw-bold">Medinex Assistant</h5><div className="small text-muted">Ask about your medicines, side effects or storage.</div></div>
                </div>
                <div className="flex-grow-1 overflow-auto p-4 d-flex flex-column gap-3">
                  {chatHistory.map((m, i) => (
                    <div key={i} className={`d-flex ${m.sender === 'user' ? 'justify-content-end' : ''}`}>
                      <div style={{ maxWidth: '80%', whiteSpace: 'pre-wrap', lineHeight: 1.6, padding: '12px 16px', borderRadius: 18,
                        background: m.sender === 'user' ? 'var(--mx-grad)' : '#f1f5f9', color: m.sender === 'user' ? '#fff' : 'var(--ink)',
                        borderBottomRightRadius: m.sender === 'user' ? 4 : 18, borderBottomLeftRadius: m.sender === 'ai' ? 4 : 18 }}>{m.text}</div>
                    </div>
                  ))}
                  {isChatLoading && <div className="text-muted small fst-italic d-flex align-items-center gap-2"><span className="spinner-border spinner-border-sm" /> Thinking…</div>}
                  <div ref={chatEnd} />
                </div>
                {chatHistory.length === 1 && (
                  <div className="px-4 pb-2 d-flex flex-wrap gap-2">
                    {['What are my current medicines?', 'Common side effects to watch for?', 'How should I store my tablets?'].map(s => (
                      <button key={s} className="mx-btn mx-btn-soft" style={{ padding: '6px 14px', fontSize: '.8rem' }} onClick={() => setChatInput(s)}>{s}</button>
                    ))}
                  </div>
                )}
                <form onSubmit={handleAskAI} className="p-3 d-flex gap-2" style={{ borderTop: '1px solid var(--line)' }}>
                  <input className="mx-input" style={{ borderRadius: 999 }} placeholder="Type your question…" value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={isChatLoading} />
                  <button className="mx-btn mx-btn-primary" disabled={isChatLoading || !chatInput.trim()}>Send</button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR: allergies */}
        {sidebar && (
          <div className="col-lg-4">
            <div className="mx-card mx-card-pad position-sticky fade-in" style={{ top: 88 }}>
              <h5 className="mx-card-title">⚠️ Safety alerts</h5>
              <p className="mx-card-sub">Every doctor and pharmacist sees these.</p>
              {profile?.allergies ? (
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {profile.allergies.split(/[\n,]+/).map(a => a.trim()).filter(Boolean).map((a, i) => (
                    <span key={i} className="mx-pill Stopped" style={{ fontSize: '.82rem' }}>{a}</span>
                  ))}
                </div>
              ) : <div className="mx-alert success">✅ No known allergies recorded.</div>}
              <form onSubmit={handleUpdateAllergies}>
                <label className="mx-label">Update allergy info</label>
                <textarea className="mx-textarea" style={{ minHeight: 80 }} placeholder="Separate with commas (e.g. Peanuts, Aspirin)" value={allergiesInput} onChange={(e) => setAllergiesInput(e.target.value)} />
                <button type="submit" className="mx-btn mx-btn-primary mx-btn-block mt-2">Save</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientDashboard;
