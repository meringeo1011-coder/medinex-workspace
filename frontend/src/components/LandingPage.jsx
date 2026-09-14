import { Link } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  return (
    <div className="medinex-landing">

      {/* ---------- HERO ---------- */}
      <section className="ml-hero ml-breakout">
        <div className="ml-hero-inner">
          <span className="ml-eyebrow">PATIENTS · DOCTORS · HOSPITALS · PHARMACISTS — ONE RECORD TRAIL</span>
          <h1>
            The gap between <span className="ml-accent">prescribed</span> and <span className="ml-accent">picked up</span> is where mistakes happen.
          </h1>
          <p className="ml-hero-sub">
            Medinex checks every new medicine against a patient's allergies and current prescriptions the moment a doctor types it in — then tracks it through the pharmacy and back to the patient's file.
          </p>
          <div className="ml-hero-cta">
            <Link to="/register" className="ml-btn-primary">Create your account</Link>
            <Link to="/login" className="ml-btn-ghost">Sign in</Link>
          </div>

          {/* Signature element: the real prescription lifecycle, as it exists in the product */}
          <div className="ml-pathway-wrap">
            <div className="ml-pathway">
              <div className="ml-pathway-track"></div>
              <div className="ml-pathway-track-fill"></div>

              <div className="ml-node">
                <div className="ml-node-dot ml-mono">01</div>
                <div className="ml-node-label">Prescribed</div>
                <div className="ml-node-sub">Doctor writes it to the patient's file</div>
              </div>
              <div className="ml-node is-flagged">
                <div className="ml-node-dot ml-mono">!</div>
                <div className="ml-node-label">AI-checked</div>
                <div className="ml-node-sub">Screened for allergy & interaction conflicts</div>
              </div>
              <div className="ml-node">
                <div className="ml-node-dot ml-mono">02</div>
                <div className="ml-node-label">Dispensed</div>
                <div className="ml-node-sub">Picked up after OTP-verified pharmacist access</div>
              </div>
              <div className="ml-node">
                <div className="ml-node-dot ml-mono">03</div>
                <div className="ml-node-label">Completed</div>
                <div className="ml-node-sub">Course finished, logged in medication history</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- STAT STRIP ---------- */}
      <section className="ml-strip ml-breakout">
        <div className="ml-strip-inner">
          <div className="ml-strip-item">Every new medicine is checked against the patient's allergy list and active prescriptions</div>
          <div className="ml-strip-item">Uploaded lab reports are read and summarized in plain language automatically</div>
          <div className="ml-strip-item">Pharmacist access to a patient's record requires a one-time code, every visit</div>
          <div className="ml-strip-item">Hospitals go live only after license details are reviewed by an admin</div>
        </div>
      </section>

      {/* ---------- SAFETY CHECK SPOTLIGHT ---------- */}
      <section className="ml-section">
        <div className="ml-spotlight">
          <div className="ml-spotlight-copy">
            <span className="ml-kicker">The moment it matters</span>
            <h2>Caught before the signature, not after the dose.</h2>
            <p style={{ color: 'var(--ink-soft)', marginTop: '14px', lineHeight: 1.6 }}>
              As a doctor types a new medicine, Medinex quietly checks it against what the patient is allergic to and what they're already taking — no extra step, no separate lookup.
            </p>
            <ul>
              <li>
                <span className="ml-check-icon">✓</span>
                <span><strong>Allergy match</strong> — flagged instantly against the patient's recorded allergies, before anything else runs.</span>
              </li>
              <li>
                <span className="ml-check-icon">✓</span>
                <span><strong>Interaction check</strong> — cross-referenced against every medicine currently active on the patient's file.</span>
              </li>
              <li>
                <span className="ml-check-icon">✓</span>
                <span><strong>Duplicate therapy</strong> — warns if the new prescription overlaps with something already being treated.</span>
              </li>
            </ul>
          </div>

          <div className="ml-mock">
            <div className="ml-mock-label">Medicine Name</div>
            <div className="ml-mock-input">Amoxicillin 500mg</div>
            <div className="ml-mock-alert">
              <span>⚠️</span>
              <span>Patient has a documented allergy to "penicillin", which matches the medicine being prescribed. Do not proceed without review.</span>
            </div>
            <div className="ml-mock-idrow">
              <span>Patient ID</span>
              <span className="ml-mono">PT-482911</span>
            </div>
            <div className="ml-mock-idrow" style={{ borderTop: 'none', paddingTop: 0, marginTop: 10 }}>
              <span>Status</span>
              <span className="ml-status-chip">ACTIVE</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- ROLES ---------- */}
      <section className="ml-section" style={{ paddingTop: 0 }}>
        <div className="ml-section-head">
          <span className="ml-kicker">Built for four different logins</span>
          <h2>One system, seen differently by everyone in it.</h2>
        </div>
        <div className="ml-roles">
          <div className="ml-role-card">
            <div className="ml-role-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="8" r="4" /></svg>
            </div>
            <h3>Patients</h3>
            <p>See every prescription's status, get plain-language summaries the moment a lab report is uploaded, and set allergies once — every doctor sees them from then on.</p>
          </div>
          <div className="ml-role-card">
            <div className="ml-role-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v4M16 3v4M4 11h16M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" /></svg>
            </div>
            <h3>Doctors</h3>
            <p>Search a patient by ID, see their allergies and history in one view, and get an automatic safety check as you type each new prescription.</p>
          </div>
          <div className="ml-role-card">
            <div className="ml-role-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M9 21V11h6v10M9 3h6v4H9z" /></svg>
            </div>
            <h3>Hospitals</h3>
            <p>Register with your license on file, then manage doctors and patient complaints from one dashboard — access opens only after admin review.</p>
          </div>
          <div className="ml-role-card">
            <div className="ml-role-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 7h6M9 12h6M9 17h3" /></svg>
            </div>
            <h3>Pharmacists</h3>
            <p>Look up a patient's active prescriptions only after they approve a one-time code sent to their inbox — no code, no access to their record.</p>
          </div>
        </div>
      </section>

      {/* ---------- SECURITY BAND ---------- */}
      <section className="ml-security ml-breakout">
        <div className="ml-security-inner">
          <div>
            <span className="ml-kicker" style={{ color: 'rgba(255,255,255,0.7)' }}>Access, not just records</span>
            <h2>A record is only as private as who can open it.</h2>
            <p>Medinex doesn't just store medical data — it controls who can see it, and when, at every role in the chain.</p>
          </div>
          <div className="ml-security-list">
            <div className="ml-security-item">
              <span className="ml-mono">HOSPITAL ONBOARDING</span>
              <p>New hospital accounts sit in a pending queue with their license on file until an admin approves, rejects, or revokes access.</p>
            </div>
            <div className="ml-security-item">
              <span className="ml-mono">PHARMACY ACCESS</span>
              <p>A pharmacist can't open a patient's prescriptions without a one-time code the patient receives directly — every single visit.</p>
            </div>
            <div className="ml-security-item">
              <span className="ml-mono">COMPLAINTS</span>
              <p>Patients can file a formal complaint about a hospital or doctor straight from their own dashboard, routed to that hospital's admin.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="ml-final">
        <h2>Bring your hospital, your patients, and your pharmacy onto one record.</h2>
        <p>Free to set up. Approval-gated, so nothing goes live without review.</p>
        <div className="ml-hero-cta" style={{ animation: 'none', opacity: 1 }}>
          <Link to="/register" className="ml-btn-primary">Create your account</Link>
          <Link to="/login" className="ml-btn-ghost">Sign in</Link>
        </div>
      </section>

    </div>
  );
}

export default LandingPage;
