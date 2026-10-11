import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000';

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

function AdminDashboard() {
  const [hospitals, setHospitals] = useState([]);
  const [patients, setPatients] = useState([]);
  const [pharmacists, setPharmacists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null); // { type: 'ok' | 'err', text }
  const [tab, setTab] = useState('pending');
  const [query, setQuery] = useState('');

  const token = localStorage.getItem('token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [h, p, ph] = await Promise.all([
        axios.get(`${API}/api/admin/hospitals`, { headers }),
        axios.get(`${API}/api/admin/users?role=Patient`, { headers }),
        axios.get(`${API}/api/admin/users?role=Pharmacist`, { headers }),
      ]);
      setHospitals(h.data);
      setPatients(p.data);
      setPharmacists(ph.data);
    } catch (error) {
      console.error('Failed to load admin data', error);
      showToast('err', 'Could not load data. Is the server running?');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStatusChange = async (hospital, newStatus) => {
    const verb = newStatus === 'Approved' ? 'approve' : 'reject';
    if (newStatus === 'Rejected' && !window.confirm(`Reject / remove access for "${hospital.name}"?`)) return;
    try {
      await axios.put(`${API}/api/admin/hospitals/${hospital.id}/status`, { status: newStatus }, { headers });
      showToast('ok', `${hospital.name} ${newStatus === 'Approved' ? 'approved' : 'rejected'}.`);
      fetchAll();
    } catch {
      showToast('err', `Could not ${verb} ${hospital.name}.`);
    }
  };

  const handleUserToggle = async (user, isActive) => {
    if (!isActive && !window.confirm(`Remove ${user.name}? They will no longer be able to use Medinex.`)) return;
    try {
      await axios.put(`${API}/api/admin/users/${user.id}/status`, { is_active: isActive }, { headers });
      showToast('ok', isActive ? `${user.name} restored.` : `${user.name} removed.`);
      fetchAll();
    } catch {
      showToast('err', 'Could not update this user.');
    }
  };

  const pending = hospitals.filter(h => h.approval_status === 'Pending');
  const approved = hospitals.filter(h => h.approval_status === 'Approved');
  const rejected = hospitals.filter(h => h.approval_status === 'Rejected');

  const TABS = {
    pending:     { icon: '⏳', label: 'Pending', title: 'Hospitals awaiting approval', desc: 'Check the licence number and document before approving.', rows: pending, kind: 'hospital', empty: ['🎉', 'All caught up', 'No hospitals are waiting for approval.'] },
    approved:    { icon: '✅', label: 'Active hospitals', title: 'Active hospitals', desc: 'Approved hospitals that can currently use Medinex.', rows: approved, kind: 'hospital', empty: ['🏥', 'No active hospitals yet', 'Approved hospitals will appear here.'] },
    rejected:    { icon: '🚫', label: 'Rejected', title: 'Rejected or removed hospitals', desc: 'These hospitals cannot sign in. You can re-approve them.', rows: rejected, kind: 'hospital', empty: ['👍', 'Nothing here', 'No hospitals have been rejected.'] },
    patients:    { icon: '🧑‍⚕️', label: 'Patients', title: 'Patients', desc: 'Everyone registered as a patient.', rows: patients, kind: 'patient', empty: ['🧑‍⚕️', 'No patients yet', 'Patients appear here once they register.'] },
    pharmacists: { icon: '💊', label: 'Pharmacists', title: 'Pharmacists', desc: 'Everyone registered as a pharmacist.', rows: pharmacists, kind: 'pharmacist', empty: ['💊', 'No pharmacists yet', 'Pharmacists appear here once they register.'] },
  };

  const current = TABS[tab];
  const q = query.trim().toLowerCase();
  const visible = current.rows.filter(r =>
    !q || [r.name, r.email, r.license_number, r.patient_unique_id].some(v => String(v || '').toLowerCase().includes(q))
  );

  const changeTab = (key) => { setTab(key); setQuery(''); };

  const renderStat = ({ k, icon, bg, num, label, extra = '' }) => (
    <button key={k} type="button" className={`ad-stat ${extra} ${tab === k ? 'on' : ''}`} onClick={() => changeTab(k)}>
      <span className="ico" style={{ background: bg }}>{icon}</span>
      <span><span className="num">{loading ? '–' : num}</span><span className="lbl">{label}</span></span>
    </button>
  );

  const renderNav = (k, count, warn = false) => (
    <button key={k} type="button" className={`ad-nav ${tab === k ? 'on' : ''}`} onClick={() => changeTab(k)}>
      <span className="ico">{TABS[k].icon}</span>{TABS[k].label}
      <span className={`n ${warn && count > 0 ? 'warn' : ''}`}>{count}</span>
    </button>
  );

  const renderHospitalRow = (h) => (
    <tr key={h.id}>
      <td>
        <div className="ad-person">
          <div className="ad-avatar">{initials(h.name)}</div>
          <div><div className="nm">{h.name}</div><div className="em">{h.email}</div><div className="em">Registered {formatDate(h.created_at)}</div></div>
        </div>
      </td>
      <td>{h.license_number ? <span className="mx-code-tag">{h.license_number}</span> : <span className="ad-muted">Not provided</span>}</td>
      <td>
        {h.license_file
          ? <a className="ad-doc" href={`${API}/uploads/${h.license_file}`} target="_blank" rel="noreferrer">📄 View licence</a>
          : <span className="ad-muted">No file</span>}
      </td>
      <td><span className={`mx-pill ${h.approval_status}`}>{h.approval_status}</span></td>
      <td>
        <div className="ad-actions">
          {h.approval_status === 'Pending' && (<>
            <button className="mx-btn mx-btn-success mx-btn-sm" onClick={() => handleStatusChange(h, 'Approved')}>Approve</button>
            <button className="mx-btn mx-btn-outline-danger mx-btn-sm" onClick={() => handleStatusChange(h, 'Rejected')}>Reject</button>
          </>)}
          {h.approval_status === 'Approved' && (
            <button className="mx-btn mx-btn-outline-danger mx-btn-sm" onClick={() => handleStatusChange(h, 'Rejected')}>Remove access</button>
          )}
          {h.approval_status === 'Rejected' && (
            <button className="mx-btn mx-btn-outline-success mx-btn-sm" onClick={() => handleStatusChange(h, 'Approved')}>Re-approve</button>
          )}
        </div>
      </td>
    </tr>
  );

  const renderUserRow = (u, showPatientId) => (
    <tr key={u.id}>
      <td>
        <div className="ad-person">
          <div className={`ad-avatar ${u.is_active ? 'teal' : 'gray'}`}>{initials(u.name)}</div>
          <div><div className="nm">{u.name}</div><div className="em">{u.email}</div><div className="em">Registered {formatDate(u.created_at)}</div></div>
        </div>
      </td>
      {showPatientId && <td>{u.patient_unique_id ? <span className="mx-code-tag">{u.patient_unique_id}</span> : <span className="ad-muted">—</span>}</td>}
      <td><span className={`mx-pill ${u.is_active ? 'Approved' : 'Removed'}`}>{u.is_active ? 'Active' : 'Removed'}</span></td>
      <td>
        <div className="ad-actions">
          {u.is_active
            ? <button className="mx-btn mx-btn-outline-danger mx-btn-sm" onClick={() => handleUserToggle(u, false)}>Remove</button>
            : <button className="mx-btn mx-btn-outline-success mx-btn-sm" onClick={() => handleUserToggle(u, true)}>Restore</button>}
        </div>
      </td>
    </tr>
  );

  const isHospital = current.kind === 'hospital';
  const isPatient = current.kind === 'patient';

  return (
    <div className="mx-container text-start">
      <div className="mx-hero fade-in">
        <div className="eyebrow">Administration</div>
        <h2>Platform control centre</h2>
        <p className="sub">Review hospital applications and manage patient and pharmacist accounts — all in one place.</p>
      </div>

      {/* Overview numbers (click to jump to the list) */}
      <div className="ad-stats">
        {renderStat({ k: 'pending', icon: '⏳', bg: '#fef3c7', num: pending.length, label: 'Hospitals awaiting approval', extra: `alert-pending ${pending.length > 0 ? 'has' : ''}` })}
        {renderStat({ k: 'approved', icon: '🏥', bg: '#dcfce7', num: approved.length, label: 'Active hospitals' })}
        {renderStat({ k: 'patients', icon: '🧑‍⚕️', bg: '#dbeafe', num: patients.length, label: 'Patients' })}
        {renderStat({ k: 'pharmacists', icon: '💊', bg: '#ccfbf1', num: pharmacists.length, label: 'Pharmacists' })}
      </div>

      <div className="ad-layout">
        <nav className="ad-side" aria-label="Admin sections">
          <h6>Hospitals</h6>
          {renderNav('pending', pending.length, true)}
          {renderNav('approved', approved.length)}
          {renderNav('rejected', rejected.length)}
          <h6>Other users</h6>
          {renderNav('patients', patients.length)}
          {renderNav('pharmacists', pharmacists.length)}
        </nav>

        <section className="ad-panel" aria-live="polite">
          <div className="ad-panel-head">
            <div>
              <h3>{current.title}</h3>
              <p>{current.desc}</p>
            </div>
            <div className="ad-search">
              <span aria-hidden="true">🔍</span>
              <input
                type="search"
                placeholder="Search by name or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search this list"
              />
            </div>
          </div>

          {tab === 'pending' && pending.length > 0 && (
            <div className="ad-note"><span>⚠️</span><span>Open the licence document and confirm the licence number matches before you approve a hospital.</span></div>
          )}

          {loading ? (
            <>
              <div className="mx-skel ad-skel" /><div className="mx-skel ad-skel" /><div className="mx-skel ad-skel" />
            </>
          ) : visible.length === 0 ? (
            <div className="ad-empty">
              {q
                ? <><span className="big">🔎</span><strong>No matches</strong>Nothing matches “{query}”.</>
                : <><span className="big">{current.empty[0]}</span><strong>{current.empty[1]}</strong>{current.empty[2]}</>}
            </div>
          ) : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  {isHospital ? (
                    <tr><th>Hospital</th><th>Licence no.</th><th>Document</th><th>Status</th><th>Action</th></tr>
                  ) : (
                    <tr><th>{isPatient ? 'Patient' : 'Pharmacist'}</th>{isPatient && <th>Patient ID</th>}<th>Status</th><th>Action</th></tr>
                  )}
                </thead>
                <tbody>
                  {isHospital
                    ? visible.map(renderHospitalRow)
                    : visible.map(u => renderUserRow(u, isPatient))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {toast && <div className={`mx-toast ${toast.type}`} role="status">{toast.text}</div>}
    </div>
  );
}

export default AdminDashboard;
