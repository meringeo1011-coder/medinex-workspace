import { Link, useNavigate, useLocation } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation(); // Forces the navbar to refresh when the page changes

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark shadow-sm mb-4" style={{ background: 'var(--ink)' }}>
      <div className="container-fluid px-4">
        <Link className="navbar-brand fw-bold fs-4" to={token ? "/dashboard" : "/"}>
          Medinex<span style={{ color: 'var(--teal)' }}>.</span>
        </Link>

        <div className="collapse navbar-collapse d-flex justify-content-end">
          <ul className="navbar-nav align-items-center">
            {/* If NO token exists, show Login/Register */}
            {!token ? (
              <>
                <li className="nav-item me-2">
                  <Link className="nav-link text-white-50" to="/">Home</Link>
                </li>
                <li className="nav-item me-2">
                  <Link className="nav-link text-white-50" to="/login">Login</Link>
                </li>
                <li className="nav-item">
                  <Link className="btn btn-light fw-bold rounded-pill px-4" style={{ color: 'var(--ink)' }} to="/register">
                    Register
                  </Link>
                </li>
              </>
            ) : (
              /* If token EXISTS, show Dashboard & Logout */
              <>
                <li className="nav-item me-4">
                  <span className="navbar-text text-white-50">
                    Signed in as: <span
                      className="badge rounded-pill ms-1 fs-6 fw-medium"
                      style={{ background: 'rgba(15,155,142,0.18)', color: 'var(--teal)', fontFamily: "'JetBrains Mono', monospace" }}
                    >{role}</span>
                  </span>
                </li>
                <li className="nav-item me-3">
                  <Link className="nav-link text-white-50" to="/dashboard">Dashboard</Link>
                </li>
                <li className="nav-item">
                  <button onClick={handleLogout} className="btn btn-danger rounded-pill px-4 shadow-sm">
                    Logout
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
