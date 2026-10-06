import { useState } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import { LogoMark } from './Logo';

const ROLES = [
  { id: 'patients', label: 'Patients', icon: '🧑‍⚕️', title: 'Your whole medical file, in your hands.',
    text: 'See every prescription and its status, get plain-language summaries of lab reports, set your allergies once so every doctor sees them, and report a problem with any prescription in two taps.',
    points: ['Prescription timeline by date or doctor', 'AI lab-report summaries', 'Complaints routed to the right hospital automatically'] },
  { id: 'doctors', label: 'Doctors', icon: '🩺', title: 'Prescribe with a safety net.',
    text: 'Search a patient by ID, see their allergies and history in one view, and get an instant safety check as you type each new medicine.',
    points: ['Allergy match before anything else', 'Interaction & duplicate-therapy warnings', 'Full history on one screen'] },
  { id: 'hospitals', label: 'Hospitals', icon: '🏥', title: 'Run your doctors and your complaints.',
    text: 'Register with your license, get approved by an admin, then manage your doctors. Patient complaints arrive with the full prescription details attached.',
    points: ['Admin-approved onboarding', 'Doctor accounts in one place', 'Complaints with prescription + allergy context'] },
  { id: 'pharmacists', label: 'Pharmacists', icon: '💊', title: 'No code, no access.',
    text: "Open a patient's active prescriptions only after they share a one-time code. Check allergies and recent purchases, then dispense.",
    points: ['OTP-verified access every visit', 'Allergies shown before dispensing', 'Dispense records feed the patient file'] },
];

function LandingPage() {
  const [role, setRole] = useState('patients');
  const active = ROLES.find(r => r.id === role);

  return (
    <div className="mn-land">
      {/* ---------- HERO ---------- */}
      <section className="mn-hero">
        <div className="mn-glow mn-glow-a" /><div className="mn-glow mn-glow-b" />
        <div className="mn-wrap mn-hero-grid">
          <div className="mn-hero-copy">
            <span className="mn-badge"><LogoMark size={18} /> Medinex · digital health records</span>
            <h1>Every prescription,<br /><span className="mn-grad">tracked and trusted.</span></h1>
            <p className="mn-lead">
              Medinex checks each new medicine against a patient's allergies the moment a doctor types it, follows it through the pharmacy, and keeps it in the patient's file.
            </p>
            <div className="mn-cta">
              <Link to="/register" className="mn-btn mn-btn-solid">Get started free →</Link>
              <Link to="/login" className="mn-btn mn-btn-outline">Login</Link>
            </div>
            <div className="mn-trust">
              <span>🔐 OTP-protected access</span><span>🧪 AI lab summaries</span><span>✅ Admin-approved hospitals</span>
            </div>
          </div>

          <div className="mn-hero-visual" aria-hidden="true">
            <div className="mn-rx">
              <div className="mn-rx-top"><span className="mn-dot" /><span className="mn-dot" /><span className="mn-dot" /><em>New prescription</em></div>
              <label>Medicine</label>
              <div className="mn-field">Amoxicillin 500mg</div>
              <div className="mn-alert"><b>⚠️ Allergy match</b><span>Patient is allergic to “penicillin”. Do not proceed without review.</span></div>
              <div className="mn-rx-row"><span>Patient ID</span><code>PT-482911</code></div>
              <div className="mn-rx-row"><span>Status</span><i className="mn-chip">ACTIVE</i></div>
            </div>
            <div className="mn-float mn-float-a">✓ Dispensed<small>OTP verified</small></div>
            <div className="mn-float mn-float-b">🧪 Lab report<small>Summary ready</small></div>
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="mn-section">
        <div className="mn-wrap">
          <span className="mn-kicker">How it works</span>
          <h2 className="mn-h2">From prescribed to completed, in four steps.</h2>
          <ol className="mn-steps">
            {[['01', 'Prescribed', "Doctor writes it to the patient's file."],
              ['02', 'Safety-checked', 'Allergy and interaction screening runs instantly.'],
              ['03', 'Dispensed', 'Pharmacist unlocks the record with a one-time code.'],
              ['04', 'Completed', 'Course finishes and joins the medication history.']].map(([n, t, d]) => (
              <li key={n}><span className="mn-step-n">{n}</span><h3>{t}</h3><p>{d}</p></li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- BENTO FEATURES ---------- */}
      <section className="mn-section mn-section-alt">
        <div className="mn-wrap">
          <span className="mn-kicker">Why Medinex</span>
          <h2 className="mn-h2">Built around safety, privacy and clarity.</h2>
          <div className="mn-bento">
            <div className="mn-tile mn-tile-big">
              <h3>Caught before the signature, not after the dose.</h3>
              <p>As a doctor types, Medinex checks the medicine against the patient's recorded allergies and current prescriptions — no extra step, no separate lookup.</p>
              <div className="mn-pills"><span>Allergy match</span><span>Interactions</span><span>Duplicate therapy</span></div>
            </div>
            <div className="mn-tile"><div className="mn-ico">🔑</div><h3>Code-gated pharmacy</h3><p>No one-time code from the patient, no access to their record.</p></div>
            <div className="mn-tile"><div className="mn-ico">🧪</div><h3>Lab reports, explained</h3><p>Uploads are read and summarised in plain language.</p></div>
            <div className="mn-tile"><div className="mn-ico">⚑</div><h3>Complaints that route themselves</h3><p>Pick a prescription — the hospital and doctor fill in automatically.</p></div>
            <div className="mn-tile"><div className="mn-ico">🛡️</div><h3>Approval-gated hospitals</h3><p>Nothing goes live until an admin reviews the license.</p></div>
          </div>
        </div>
      </section>

      {/* ---------- ROLES (interactive) ---------- */}
      <section className="mn-section">
        <div className="mn-wrap">
          <span className="mn-kicker">One system, four logins</span>
          <h2 className="mn-h2">See Medinex through your role.</h2>
          <div className="mn-tabs" role="tablist">
            {ROLES.map(r => (
              <button key={r.id} role="tab" aria-selected={role === r.id} className={role === r.id ? 'on' : ''} onClick={() => setRole(r.id)}>
                <span>{r.icon}</span>{r.label}
              </button>
            ))}
          </div>
          <div className="mn-panel" key={active.id}>
            <div>
              <h3>{active.title}</h3>
              <p>{active.text}</p>
              <Link to="/register" className="mn-btn mn-btn-solid">Join as {active.label.toLowerCase().replace(/s$/, '')} →</Link>
            </div>
            <ul>{active.points.map(p => <li key={p}><span>✓</span>{p}</li>)}</ul>
          </div>
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="mn-final">
        <div className="mn-wrap">
          <h2>Bring your hospital, patients and pharmacy onto one record.</h2>
          <p>Free to set up. Approval-gated, so nothing goes live without review.</p>
          <div className="mn-cta mn-cta-center">
            <Link to="/register" className="mn-btn mn-btn-solid">Create your account</Link>
            <Link to="/login" className="mn-btn mn-btn-outline">Login</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
