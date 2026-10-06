import Logo from './Logo';
import heroArt from '../assets/auth-hero.svg';

// Shared split layout used by Login / Register / Forgot / Reset password.
// Left: brand panel with illustration. Right: the form.
// The common header (Navbar) sits above it, so the height leaves room for it.
export default function AuthShell({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="mx-auth" style={{ minHeight: 'calc(100svh - 70px)' }}>
      <aside className="mx-auth-brand">
        <Logo light size={46} />

        <div className="mx-auth-brand-inner">
          <h2>One record trail for every prescription.</h2>
          <p>Doctors prescribe. Pharmacists dispense. Patients stay in control — and every step is tracked.</p>
          <img className="mx-auth-art" src={heroArt} alt="Illustration of a digital prescription, a security shield and a one-time code" />
        </div>

        <ul className="mx-auth-chips">
          <li><span>✓</span> Allergy &amp; interaction checks</li>
          <li><span>✓</span> OTP-protected pharmacy access</li>
          <li><span>✓</span> Plain-language lab summaries</li>
        </ul>

        <div className="mx-auth-orb mx-auth-orb-a" />
        <div className="mx-auth-orb mx-auth-orb-b" />
      </aside>

      <main className="mx-auth-main">
        <div className={`mx-auth-card ${wide ? 'wide' : ''}`}>
          <div className="mx-auth-mobile-logo"><Logo size={38} /></div>
          <h1 className="mx-auth-title">{title}</h1>
          {subtitle && <p className="mx-auth-sub">{subtitle}</p>}
          {children}
          {footer && <div className="mx-auth-foot">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
