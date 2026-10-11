import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout, requireAuth } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const navigate = useNavigate();

  const handleScheduleVisitClick = (e) => {
    e.preventDefault();
    if (requireAuth('Schedule a Visit', '/visit-request')) {
      navigate('/visit-request');
    }
  };

  const handleBookRoomClick = (e) => {
    e.preventDefault();
    if (requireAuth('Book a Room', '/book-room')) {
      navigate('/book-room');
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-glass sticky-top py-2">
      <div className="container">
        {/* Brand */}
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <div
            className="d-flex align-items-center justify-content-center text-white rounded-3 shadow-sm"
            style={{
              width: '42px',
              height: '42px',
              background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
              fontWeight: 800,
              fontSize: '1.2rem',
            }}
          >
            SL
          </div>
          <div>
            <div className="fw-bold text-dark lh-1" style={{ fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
              SRI LAKSHMI SRINIVASA
            </div>
            <div className="text-muted fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
              GENTS PG • VELACHERY, CHENNAI
            </div>
          </div>
        </Link>

        {/* Mobile Toggle Button */}
        <button
          className="navbar-toggler border-0 shadow-none"
          type="button"
          onClick={() => setNavOpen(!navOpen)}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Navigation Links */}
        <div className={`collapse navbar-collapse ${navOpen ? 'show' : ''}`} id="mainNav">
          <ul className="navbar-nav mx-auto mb-2 mb-lg-0 fw-medium gap-lg-2">
            <li className="nav-item">
              <NavLink className="nav-link px-2" to="/" onClick={() => setNavOpen(false)}>
                Home
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link px-2" to="/about" onClick={() => setNavOpen(false)}>
                About
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link px-2" to="/rooms" onClick={() => setNavOpen(false)}>
                Rooms
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link px-2" to="/facilities" onClick={() => setNavOpen(false)}>
                Facilities
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link px-2" to="/gallery" onClick={() => setNavOpen(false)}>
                Gallery
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link px-2" to="/location" onClick={() => setNavOpen(false)}>
                Location
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link px-2" to="/contact" onClick={() => setNavOpen(false)}>
                Contact
              </NavLink>
            </li>
          </ul>

          {/* Action & Auth buttons */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              onClick={handleScheduleVisitClick}
              className="btn btn-sm btn-pg-primary d-none d-md-inline-flex"
            >
              <i className="bi bi-calendar-check"></i>
              Schedule a Visit
            </button>

            {isAuthenticated ? (
              <div className="dropdown">
                <button
                  className="btn btn-sm btn-pg-secondary dropdown-toggle d-flex align-items-center gap-2"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  onClick={(e) => {
                    const menu = e.currentTarget.nextElementSibling;
                    if (menu) menu.classList.toggle('show');
                  }}
                >
                  <i className="bi bi-person-circle text-primary"></i>
                  <span className="d-none d-sm-inline">{user.full_name?.split(' ')[0]}</span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 py-2">
                  <li className="px-3 py-1 text-muted small border-bottom mb-1">
                    Signed in as <strong className="text-dark">{user.email}</strong>
                  </li>
                  {isAdmin ? (
                    <>
                      <li>
                        <Link className="dropdown-item py-2 fw-semibold text-primary" to="/admin/dashboard" onClick={() => setNavOpen(false)}>
                          <i className="bi bi-speedometer2 me-2"></i>Admin Dashboard
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item py-2" to="/admin/visits" onClick={() => setNavOpen(false)}>
                          <i className="bi bi-calendar3 me-2"></i>Manage Visits
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item py-2" to="/admin/bookings" onClick={() => setNavOpen(false)}>
                          <i className="bi bi-door-open me-2"></i>Manage Bookings
                        </Link>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <Link className="dropdown-item py-2 fw-semibold" to="/dashboard" onClick={() => setNavOpen(false)}>
                          <i className="bi bi-grid me-2"></i>User Dashboard
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item py-2" to="/my-visits" onClick={() => setNavOpen(false)}>
                          <i className="bi bi-calendar-check me-2"></i>My Visits
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item py-2" to="/my-bookings" onClick={() => setNavOpen(false)}>
                          <i className="bi bi-key me-2"></i>My Bookings
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item py-2" to="/notifications" onClick={() => setNavOpen(false)}>
                          <i className="bi bi-bell me-2"></i>Notifications
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item py-2" to="/profile" onClick={() => setNavOpen(false)}>
                          <i className="bi bi-person-gear me-2"></i>Profile Settings
                        </Link>
                      </li>
                    </>
                  )}
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button
                      className="dropdown-item text-danger py-2"
                      onClick={() => {
                        logout();
                        navigate('/');
                        setNavOpen(false);
                      }}
                    >
                      <i className="bi bi-box-arrow-right me-2"></i>Logout
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-2">
                <Link to="/login" className="btn btn-sm btn-pg-secondary" onClick={() => setNavOpen(false)}>
                  Login
                </Link>
                <Link to="/register" className="btn btn-sm btn-outline-dark fw-semibold" onClick={() => setNavOpen(false)}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
