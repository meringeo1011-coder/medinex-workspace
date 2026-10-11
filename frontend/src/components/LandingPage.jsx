import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import { LogoMark } from './Logo';

const SUPPORT_EMAIL = 'medinex.support@gmail.com';

/* ---------------- content (edit text here) ---------------- */
const NAV = [
  ['features', 'Features'], ['how', 'How it works'], ['rules', 'Safety rules'],
  ['roles', 'Roles'], ['faq', 'FAQ'], ['contact', 'Contact'],
];

const STATS = [
  ['5', 'Role-based portals'],
  ['Doctor-only', 'Prescription writing'],
  ['OTP', 'Pharmacy access gate'],
  ['PDF', 'History in one tap'],
];

const STEPS = [
  ['01', 'Prescribed', "A verified doctor writes it to the patient's file."],
  ['02', 'Safety-checked', 'Allergy and interaction screening runs as they type.'],
  ['03', 'Dispensed', 'The pharmacist unlocks the record with a one-time code.'],
  ['04', 'Completed', 'The course ends and joins the medication history.'],
];

const FEATURES = [
  { icon: '🧪', title: 'Lab reports, explained', text: 'Uploaded reports are read and summarised in plain language.' },
  { icon: '🔑', title: 'Code-gated pharmacy', text: 'No one-time code from the patient, no access to their record.' },
  { icon: '⚑', title: 'Complaints that route themselves', text: 'Pick a prescription and the hospital and doctor fill in automatically.' },
  { icon: '📄', title: 'Downloadable history', text: 'Save any prescription, or your whole history, as a PDF or spreadsheet.' },
  { icon: '🛡️', title: 'Approval-gated hospitals', text: 'Nothing goes live until an admin reviews the hospital licence.' },
];

const RULES = [
  { icon: '🩺', title: 'Doctors only', tag: 'Role-enforced',
    text: 'Only a doctor account can issue a prescription. Patients, pharmacists and hospital accounts can view records but never write one.' },
  { icon: '🏥', title: 'Registered hospitals only', tag: 'Licence-verified',
    text: 'A doctor must belong to a hospital that is registered and approved on Medinex. A prescription from an unregistered hospital is rejected.' },
  { icon: '🔐', title: 'Checked on every request', tag: 'Always current',
    text: 'If a hospital is suspended, its doctors lose the ability to prescribe straight away, even if they are still logged in.' },
];

const ROLES = [
  { id: 'patients', label: 'Patients', icon: '🧑‍⚕️', title: 'Your whole medical file, in your hands.',
    text: 'See every prescription and its status, get plain-language summaries of lab reports, set your allergies once so every doctor sees them, and report a problem with any prescription in two taps.',
    points: ['Prescription timeline and PDF downloads', 'AI lab-report summaries', 'Complaints routed to the right hospital'] },
  { id: 'doctors', label: 'Doctors', icon: '🩺', title: 'Prescribe with a safety net.',
    text: 'Search a patient by ID, see their allergies and history in one view, and get an instant safety check as you type each new medicine.',
    points: ['Only verified doctors can prescribe', 'Allergy, interaction and duplicate-therapy warnings', 'Full history on one screen'] },
  { id: 'hospitals', label: 'Hospitals', icon: '🏥', title: 'Run your doctors and your complaints.',
    text: 'Register with your licence, get approved by an admin, then manage your doctors. Patient complaints arrive with the full prescription details attached.',
    points: ['Admin-approved, licence-checked onboarding', 'Only your registered doctors can prescribe', 'Complaints with prescription and allergy context'] },
  { id: 'pharmacists', label: 'Pharmacists', icon: '💊', title: 'No code, no access.',
    text: "Open a patient's active prescriptions only after they share a one-time code. Check allergies and recent purchases, then dispense.",
    points: ['OTP-verified access every visit', 'Allergies shown before dispensing', 'Dispense records feed the patient file'] },
];

const FAQ = [
  ['Who is allowed to add a prescription?', 'Only logged-in doctors working at a hospital that is registered and approved on Medinex. No other role can add or edit prescriptions.'],
  ['What if my hospital is not registered?', "A prescription from a hospital that isn't registered and approved cannot be added to a patient's record. The hospital needs to register and get admin approval first."],
  ['Can I download my prescription history?', 'Yes. From your dashboard you can download everything as one PDF, filter to current or past prescriptions, download a single prescription, or export a spreadsheet copy.'],
  ['Does the pharmacy see my records automatically?', 'No. A pharmacist only gets access after you share a one-time code with them.'],
  ['How do hospitals get approved?', 'A hospital registers with its licence number and document. An admin reviews them and approves or rejects the application.'],
  ['Who do I contact if I need help?', `Email ${SUPPORT_EMAIL} and the Medinex team will get back to you.`],
];

const CONTACT_TOPICS = [
  'Help registering your hospital',
  'Account or login problems',
  'Questions about your records',
  'Feedback and suggestions',
];

/* ---------------- scroll reveal helper ---------------- */
function Reveal({ as: Tag = 'div', className = '', delay = 0, children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); io.disconnect(); }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`mn-reveal ${shown ? 'in' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ---------------- page ---------------- */
function LandingPage() {
  const [role, setRole] = useState('patients');
  const [copied, setCopied] = useState(false);
  const [menu, setMenu] = useState(false);
  const active = ROLES.find(r => r.id === role);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable: the mailto link still works */ }
  };

  return (
    <div className="mn-land">

      {/* ============ NAVBAR ============ */}
      <div className="mn-navbar">
        <div className="mn-wrap mn-navbar-in">
          <a href="#top" className="mn-brand" onClick={() => setMenu(false)}>
            <LogoMark size={26} /> Medinex
          </a>

          <nav className={`mn-links ${menu ? 'open' : ''}`} aria-label="Page sections">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>{label}</a>
            ))}
          </nav>

          <button
            type="button"
            className={`mn-burger ${menu ? 'open' : ''}`}
            aria-label="Toggle menu"
            aria-expanded={menu}
            onClick={() => setMenu(m => !m)}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* ============ 1. HERO ============ */}
      <header className="mn-hero" id="top">
        <div className="mn-grid-bg" />
        <div className="mn-glow mn-glow-a" /><div className="mn-glow mn-glow-b" /><div className="mn-glow mn-glow-c" />
        <div className="mn-wrap">
          <div className="mn-hero-grid">
            <div className="mn-hero-copy">
              <Reveal as="span" className="mn-badge"><i className="mn-dot" /> Medinex · digital health records</Reveal>
              <Reveal as="h1" delay={80}>
                Your health story.<br /><span className="mn-grad">Safely connected.</span>
              </Reveal>
              <Reveal as="p" className="mn-lead" delay={160}>
                Prescriptions, lab reports and your care team in one secure place. Only verified doctors from registered
                hospitals can write to your record, and your full history is always one tap from download.
              </Reveal>
              <Reveal className="mn-cta" delay={240}>
                <Link to="/register" className="mn-btn mn-btn-solid mn-btn-lg">Create your health profile →</Link>
                <Link to="/login" className="mn-btn mn-btn-outline mn-btn-lg">Login</Link>
              </Reveal>
              <Reveal as="ul" className="mn-trust" delay={320}>
                <li><span>🩺</span> Doctor-only prescriptions</li>
                <li><span>🏥</span> Registered hospitals only</li>
                <li><span>🔐</span> OTP-protected access</li>
                <li><span>📄</span> Downloadable history</li>
              </Reveal>
            </div>

            <Reveal className="mn-hero-visual" delay={200} aria-hidden="true">
              <div className="mn-rx">
                <div className="mn-rx-head">
                  <span><LogoMark size={16} /> E-prescription</span>
                  <i className="mn-chip">✓ Verified</i>
                </div>
                <small className="mn-label">Medicine</small>
                <div className="mn-field">Amoxicillin 500mg</div>
                <small className="mn-label">Dosage</small>
                <div className="mn-field mn-field-sm">1 tablet · 5 days · Morning, Night · After food</div>
                <div className="mn-rx-row"><span>Issued by</span><b>Dr. A. Nair</b></div>
                <div className="mn-rx-row"><span>Hospital</span><b>City Care Hospital <i className="mn-chip">Registered</i></b></div>
                <div className="mn-rx-row"><span>Patient ID</span><code>PT-482911</code></div>
                <div className="mn-rx-btn">↓ Download PDF</div>
              </div>
              <div className="mn-float mn-float-a">✅ Allergy check passed<small>Before it is saved</small></div>
              <div className="mn-float mn-float-b">🚫 Unregistered hospital<small>Prescription blocked</small></div>
              <p className="mn-sample">Sample prescription</p>
            </Reveal>
          </div>
        </div>
      </header>

      {/* ============ 2. STATS ============ */}
      <section className="mn-stats" aria-label="Highlights">
        <div className="mn-wrap mn-stats-grid">
          {STATS.map(([n, l], i) => (
            <Reveal key={l} delay={i * 70} className="mn-stat"><b>{n}</b><span>{l}</span></Reveal>
          ))}
        </div>
      </section>

      {/* ============ 3. HOW IT WORKS ============ */}
      <section className="mn-section" id="how">
        <div className="mn-wrap">
          <Reveal className="mn-head">
            <span className="mn-kicker">How it works</span>
            <h2 className="mn-h2">From prescribed to completed, in four steps.</h2>
          </Reveal>
          <ol className="mn-steps">
            {STEPS.map(([n, t, d], i) => (
              <Reveal as="li" key={n} delay={i * 100}>
                <span className="mn-step-n">{n}</span><h3>{t}</h3><p>{d}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ============ 4. FEATURES ============ */}
      <section className="mn-section mn-section-alt" id="features">
        <div className="mn-wrap">
          <Reveal className="mn-head">
            <span className="mn-kicker">Features</span>
            <h2 className="mn-h2">Built around safety, privacy and clarity.</h2>
          </Reveal>
          <div className="mn-bento">
            <Reveal className="mn-tile mn-tile-big">
              <span className="mn-tile-tag">Live safety check</span>
              <h3>A clearer picture of your care.</h3>
              <p>As a doctor types, Medinex checks the medicine against the patient's recorded allergies and current prescriptions, with no extra step and no separate lookup.</p>
              <div className="mn-pills"><span>Allergy match</span><span>Interactions</span><span>Duplicate therapy</span></div>
            </Reveal>
            {FEATURES.map(f => (
              <Reveal className="mn-tile mn-lift" key={f.title}>
                <div className="mn-ico">{f.icon}</div><h3>{f.title}</h3><p>{f.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 5. SAFETY RULES ============ */}
      <section className="mn-section" id="rules">
        <div className="mn-wrap">
          <Reveal className="mn-head">
            <span className="mn-kicker">Safety rules</span>
            <h2 className="mn-h2">Only the right people can write to your record.</h2>
          </Reveal>
          <div className="mn-rules">
            {RULES.map(r => (
              <Reveal as="article" className="mn-rule mn-lift" key={r.title}>
                <div className="mn-ico">{r.icon}</div>
                <h3>{r.title}</h3>
                <p>{r.text}</p>
                <span className="mn-rule-tag">{r.tag}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 6. ROLES ============ */}
      <section className="mn-section mn-section-alt" id="roles">
        <div className="mn-wrap">
          <Reveal className="mn-head">
            <span className="mn-kicker">One system, four logins</span>
            <h2 className="mn-h2">See Medinex through your role.</h2>
          </Reveal>
          <Reveal className="mn-tabs" role="tablist">
            {ROLES.map(r => (
              <button key={r.id} role="tab" aria-selected={role === r.id} className={role === r.id ? 'on' : ''} onClick={() => setRole(r.id)}>
                <span>{r.icon}</span>{r.label}
              </button>
            ))}
          </Reveal>
          <div className="mn-panel" key={active.id} role="tabpanel">
            <div>
              <h3>{active.title}</h3>
              <p>{active.text}</p>
              <Link to="/register" className="mn-btn mn-btn-solid">Join as {active.label.toLowerCase().replace(/s$/, '')} →</Link>
            </div>
            <ul>{active.points.map(p => <li key={p}><span>✓</span>{p}</li>)}</ul>
          </div>
        </div>
      </section>

      {/* ============ 7. FAQ ============ */}
      <section className="mn-section" id="faq">
        <div className="mn-wrap mn-two">
          <Reveal>
            <span className="mn-kicker">FAQ</span>
            <h2 className="mn-h2">Questions, answered.</h2>
            <p className="mn-muted">Can't find what you need? Write to us at <a className="mn-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
          </Reveal>
          <Reveal className="mn-faq" delay={100}>
            {FAQ.map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ============ 8. CONTACT ============ */}
      <section className="mn-section mn-section-alt" id="contact">
        <div className="mn-wrap mn-two">
          <Reveal>
            <span className="mn-kicker">Contact</span>
            <h2 className="mn-h2">We're here to help.</h2>
            <ul className="mn-topics">
              {CONTACT_TOPICS.map(t => <li key={t}><span>✓</span>{t}</li>)}
            </ul>
          </Reveal>
          <Reveal className="mn-contact-card" delay={100}>
            <small className="mn-label">Email support</small>
            <a className="mn-mail" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            <p>Send us a message and the Medinex team will reply by email.</p>
            <div className="mn-cta">
              <a className="mn-btn mn-btn-solid" href={`mailto:${SUPPORT_EMAIL}?subject=Medinex%20support`}>✉ Send an email</a>
              <button type="button" className="mn-btn mn-btn-outline" onClick={copyEmail}>{copied ? '✓ Copied' : 'Copy address'}</button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 9. FINAL CTA ============ */}
      <section className="mn-final">
        <div className="mn-glow mn-glow-d" />
        <div className="mn-wrap">
          <Reveal>
            <h2>Bring your hospital, patients and pharmacy onto one record.</h2>
            <p>Patients can create their own profile. Hospitals are reviewed before approval.</p>
            <div className="mn-cta mn-cta-center">
              <Link to="/register" className="mn-btn mn-btn-solid mn-btn-lg">Create your account</Link>
              <Link to="/login" className="mn-btn mn-btn-outline mn-btn-lg">Login</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 10. FOOTER ============ */}
      <footer className="mn-footer">
        <div className="mn-wrap mn-footer-grid">
          <div>
            <div className="mn-footer-brand"><LogoMark size={22} /> Medinex</div>
            <p>Secure digital health records for patients, doctors, hospitals and pharmacies.</p>
          </div>
          <div>
            <h4>Explore</h4>
            <a href="#features">Features</a><a href="#how">How it works</a><a href="#rules">Safety rules</a><a href="#faq">FAQ</a>
          </div>
          <div>
            <h4>Get started</h4>
            <Link to="/register">Create account</Link><Link to="/login">Login</Link><Link to="/forgot-password">Forgot password</Link>
          </div>
          <div>
            <h4>Contact</h4>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </div>
        </div>
        <div className="mn-wrap mn-footer-bottom">
          <span>© {new Date().getFullYear()} Medinex. All rights reserved.</span>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;