import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout, requireAuth } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown menu when clicking anywhere outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

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
              <div className="dropdown position-relative" ref={userMenuRef}>
                <button
                  className="btn btn-sm btn-pg-secondary dropdown-toggle d-flex align-items-center gap-2 shadow-xs"
                  type="button"
                  aria-expanded={userMenuOpen}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setUserMenuOpen((prev) => !prev);
                  }}
                >
                  <i className="bi bi-person-circle text-primary"></i>
                  <span className="d-none d-sm-inline fw-semibold">{user.full_name?.split(' ')[0]}</span>
                </button>
                <ul
                  className={`dropdown-menu dropdown-menu-end shadow-lg border-0 py-2 ${userMenuOpen ? 'show' : ''}`}
                  style={{
                    display: userMenuOpen ? 'block' : 'none',
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '0.4rem',
                    zIndex: 1060,
                    minWidth: '240px',
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <li className="px-3 py-2 border-bottom mb-1 bg-light rounded-top-3">
                    <div className="text-secondary" style={{ fontSize: '0.72rem' }}>Signed in as</div>
                    <div className="text-dark fw-bold text-truncate" title={user.email}>{user.email}</div>
                    <span className={`badge mt-1 ${isAdmin ? 'bg-danger' : 'bg-primary'}`} style={{ fontSize: '0.65rem' }}>
                      {isAdmin ? 'ADMINISTRATOR' : 'RESIDENT / USER'}
                    </span>
                  </li>
                  {isAdmin ? (
                    <>
                      <li>
                        <Link
                          className="dropdown-item py-2 fw-semibold text-primary d-flex align-items-center"
                          to="/admin/dashboard"
                          onClick={() => {
                            setUserMenuOpen(false);
                            setNavOpen(false);
                          }}
                        >
                          <i className="bi bi-speedometer2 me-2 fs-6"></i>
                          <span>Admin Dashboard</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          className="dropdown-item py-2 d-flex align-items-center"
                          to="/admin/rooms"
                          onClick={() => {
                            setUserMenuOpen(false);
                            setNavOpen(false);
                          }}
                        >
                          <i className="bi bi-building me-2 fs-6 text-secondary"></i>
                          <span>Room & Bed Management</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          className="dropdown-item py-2 d-flex align-items-center"
                          to="/admin/residents"
                          onClick={() => {
                            setUserMenuOpen(false);
                            setNavOpen(false);
                          }}
                        >
                          <i className="bi bi-person-badge me-2 fs-6 text-secondary"></i>
                          <span>Manage Residents</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          className="dropdown-item py-2 d-flex align-items-center"
                          to="/admin/visits"
                          onClick={() => {
                            setUserMenuOpen(false);
                            setNavOpen(false);
                          }}
                        >
                          <i className="bi bi-calendar3 me-2 fs-6 text-secondary"></i>
                          <span>Manage Visits</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          className="dropdown-item py-2 d-flex align-items-center"
                          to="/admin/bookings"
                          onClick={() => {
                            setUserMenuOpen(false);
                            setNavOpen(false);
                          }}
                        >
                          <i className="bi bi-door-open me-2 fs-6 text-secondary"></i>
                          <span>Manage Bookings</span>
                        </Link>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <Link
                          className="dropdown-item py-2 fw-semibold text-primary d-flex align-items-center"
                          to="/dashboard"
                          onClick={() => {
                            setUserMenuOpen(false);
                            setNavOpen(false);
                          }}
                        >
                          <i className="bi bi-grid me-2 fs-6"></i>
                          <span>User Dashboard</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          className="dropdown-item py-2 d-flex align-items-center"
                          to="/my-visits"
                          onClick={() => {
                            setUserMenuOpen(false);
                            setNavOpen(false);
                          }}
                        >
                          <i className="bi bi-calendar-check me-2 fs-6 text-secondary"></i>
                          <span>My Visits</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          className="dropdown-item py-2 d-flex align-items-center"
                          to="/my-bookings"
                          onClick={() => {
                            setUserMenuOpen(false);
                            setNavOpen(false);
                          }}
                        >
                          <i className="bi bi-key me-2 fs-6 text-secondary"></i>
                          <span>My Bookings</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          className="dropdown-item py-2 d-flex align-items-center"
                          to="/notifications"
                          onClick={() => {
                            setUserMenuOpen(false);
                            setNavOpen(false);
                          }}
                        >
                          <i className="bi bi-bell me-2 fs-6 text-secondary"></i>
                          <span>Notifications</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          className="dropdown-item py-2 d-flex align-items-center"
                          to="/profile"
                          onClick={() => {
                            setUserMenuOpen(false);
                            setNavOpen(false);
                          }}
                        >
                          <i className="bi bi-person-gear me-2 fs-6 text-secondary"></i>
                          <span>Profile Settings</span>
                        </Link>
                      </li>
                    </>
                  )}
                  <li><hr className="dropdown-divider my-1" /></li>
                  <li>
                    <button
                      className="dropdown-item text-danger py-2 fw-semibold d-flex align-items-center"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setNavOpen(false);
                        logout();
                        navigate('/');
                      }}
                    >
                      <i className="bi bi-box-arrow-right me-2 fs-6"></i>
                      <span>Logout</span>
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
