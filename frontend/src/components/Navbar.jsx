import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';

const ROLE_ICON = { Patient: '🧑‍⚕️', Doctor: '🩺', Hospital: '🏥', Pharmacist: '💊', Admin: '🛡️' };

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openPath, setOpenPath] = useState(null);
  const open = openPath === location.pathname; // auto-closes on navigation
  const [scrolled, setScrolled] = useState(false);

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <header className={`mx-nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="mx-nav-inner">
        <Link to={token ? '/dashboard' : '/'} aria-label="Medinex home"><Logo size={34} /></Link>

        <button className="mx-nav-toggle" onClick={() => setOpenPath(open ? null : location.pathname)} aria-label="Toggle menu" aria-expanded={open}>
          <span /><span /><span />
        </button>

        <nav className={`mx-nav-links ${open ? 'open' : ''}`}>
          {!token ? (
            <>
              <NavLink to="/" end className="mx-nav-link">Home</NavLink>
              <NavLink to="/login" className="mx-nav-link">Login</NavLink>
              <Link to="/register" className="mx-btn mx-btn-primary">Get started</Link>
            </>
          ) : (
            <>
              <NavLink to="/" end className="mx-nav-link">Home</NavLink>
              <NavLink to="/dashboard" className="mx-nav-link">Dashboard</NavLink>
              <span className="mx-role-chip"><span>{ROLE_ICON[role] || '👤'}</span>{role}</span>
              <button onClick={handleLogout} className="mx-btn mx-btn-ghost-dark">Log out</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
