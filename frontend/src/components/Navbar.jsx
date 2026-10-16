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

  // Prevent background scrolling when mobile nav drawer is open & handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && navOpen) {
        setNavOpen(false);
      }
    };

    if (navOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navOpen]);

  const handleScheduleVisitClick = (e) => {
    e.preventDefault();
    setNavOpen(false);
    if (requireAuth('Schedule a Visit', '/visit-request')) {
      navigate('/visit-request');
    }
  };

  const handleBookRoomClick = (e) => {
    e.preventDefault();
    setNavOpen(false);
    if (requireAuth('Book a Room', '/book-room')) {
      navigate('/book-room');
    }
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-glass sticky-top py-2">
        <div className="container">
          {/* Brand */}
          <Link className="navbar-brand d-flex align-items-center gap-2 py-0" to="/" onClick={() => setNavOpen(false)}>
            <div
              className="d-flex align-items-center justify-content-center text-white rounded-2 shadow-xs flex-shrink-0"
              style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
                fontWeight: 800,
                fontSize: '0.95rem',
              }}
            >
              SL
            </div>
            <div>
              <div className="fw-bold text-dark lh-1" style={{ fontSize: '0.92rem', letterSpacing: '-0.02em' }}>
                SRI LAKSHMI SRINIVASA
              </div>
              <div className="text-muted fw-semibold" style={{ fontSize: '0.62rem', letterSpacing: '0.04em' }}>
                GENTS PG • VELACHERY
              </div>
            </div>
          </Link>

          {/* Mobile Menu Button with clear accessible icon */}
          <button
            className="navbar-toggler border-0 shadow-none d-lg-none p-1 rounded-2"
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open mobile navigation"
            style={{ width: '34px', height: '34px' }}
          >
            <i className="bi bi-list fs-4 text-dark"></i>
          </button>

          {/* Desktop Navigation Links */}
          <div className="collapse navbar-collapse d-none d-lg-flex" id="mainNav">
            <ul className="navbar-nav mx-auto mb-3 mb-lg-0 fw-medium gap-lg-2 pt-2 pt-lg-0">
              <li className="nav-item">
                <NavLink className="nav-link px-2 py-2" to="/">Home</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link px-2 py-2" to="/about">About</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link px-2 py-2" to="/rooms">Rooms</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link px-2 py-2" to="/facilities">Facilities</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link px-2 py-2" to="/gallery">Gallery</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link px-2 py-2" to="/location">Location</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link px-2 py-2" to="/contact">Contact</NavLink>
              </li>
            </ul>

            {/* Desktop Auth Section */}
            <div className="pt-2 pt-lg-0 border-top border-lg-0 mt-2 mt-lg-0">
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
                    <span className="fw-semibold">{user.full_name?.split(' ')[0]}</span>
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
                          <Link className="dropdown-item py-2 fw-semibold text-primary d-flex align-items-center" to="/admin/dashboard" onClick={() => setUserMenuOpen(false)}>
                            <i className="bi bi-speedometer2 me-2 fs-6"></i>
                            <span>Admin Dashboard</span>
                          </Link>
                        </li>
                        <li>
                          <Link className="dropdown-item py-2 d-flex align-items-center" to="/admin/rooms" onClick={() => setUserMenuOpen(false)}>
                            <i className="bi bi-building me-2 fs-6 text-secondary"></i>
                            <span>Room & Bed Management</span>
                          </Link>
                        </li>
                        <li>
                          <Link className="dropdown-item py-2 d-flex align-items-center" to="/admin/rent" onClick={() => setUserMenuOpen(false)}>
                            <i className="bi bi-credit-card me-2 fs-6 text-secondary"></i>
                            <span>Rent Management</span>
                          </Link>
                        </li>
                        <li>
                          <Link className="dropdown-item py-2 d-flex align-items-center" to="/admin/residents" onClick={() => setUserMenuOpen(false)}>
                            <i className="bi bi-person-badge me-2 fs-6 text-secondary"></i>
                            <span>Manage Residents</span>
                          </Link>
                        </li>
                      </>
                    ) : (
                      <>
                        <li>
                          <Link className="dropdown-item py-2 fw-semibold text-primary d-flex align-items-center" to="/dashboard" onClick={() => setUserMenuOpen(false)}>
                            <i className="bi bi-grid me-2 fs-6"></i>
                            <span>Dashboard</span>
                          </Link>
                        </li>
                        <li>
                          <Link className="dropdown-item py-2 d-flex align-items-center" to="/my-bookings" onClick={() => setUserMenuOpen(false)}>
                            <i className="bi bi-door-open me-2 fs-6 text-secondary"></i>
                            <span>My Bookings</span>
                          </Link>
                        </li>
                        <li>
                          <Link className="dropdown-item py-2 d-flex align-items-center" to="/my-visits" onClick={() => setUserMenuOpen(false)}>
                            <i className="bi bi-calendar-check me-2 fs-6 text-secondary"></i>
                            <span>My Visits</span>
                          </Link>
                        </li>
                        <li>
                          <Link className="dropdown-item py-2 d-flex align-items-center" to="/report" onClick={() => setUserMenuOpen(false)}>
                            <i className="bi bi-exclamation-octagon me-2 fs-6 text-danger"></i>
                            <span>Report an Issue</span>
                          </Link>
                        </li>
                        <li>
                          <Link className="dropdown-item py-2 d-flex align-items-center" to="/profile" onClick={() => setUserMenuOpen(false)}>
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
                  <Link to="/login" className="btn btn-sm btn-pg-secondary px-3">
                    Login
                  </Link>
                  <Link to="/register" className="btn btn-sm btn-outline-dark fw-semibold px-3">
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE SLIDE-IN DRAWER & BACKDROP */}
      {navOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="mobile-drawer-backdrop"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in Drawer Container */}
          <div
            className="mobile-drawer-panel d-flex flex-column shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            {/* Drawer Header */}
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-light">
              <div className="d-flex align-items-center gap-2">
                <div
                  className="d-flex align-items-center justify-content-center text-white rounded-3 shadow-xs"
                  style={{
                    width: '32px',
                    height: '32px',
                    background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                  }}
                >
                  SL
                </div>
                <div className="fw-bold text-dark small">Sri Lakshmi Srinivasa PG</div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-light border-0 rounded-circle d-flex align-items-center justify-content-center text-secondary"
                style={{ width: '34px', height: '34px' }}
                onClick={() => setNavOpen(false)}
                aria-label="Close menu"
              >
                <i className="bi bi-x-lg fs-6"></i>
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="p-3 overflow-y-auto flex-grow-1 d-flex flex-column gap-3">
              {/* Authenticated Resident / Admin Account Card */}
              {isAuthenticated ? (
                <div className="p-3 bg-light rounded-3 border">
                  <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="rounded-circle bg-dark text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}
                      >
                        {user.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <div className="fw-bold text-dark text-truncate small">{user.full_name}</div>
                        <div className="text-muted text-truncate" style={{ fontSize: '0.72rem' }}>{user.email}</div>
                      </div>
                    </div>
                    <span className={`badge ${isAdmin ? 'bg-danger' : 'bg-primary'} flex-shrink-0`} style={{ fontSize: '0.65rem' }}>
                      {isAdmin ? 'Admin' : 'Resident'}
                    </span>
                  </div>

                  {/* Account Actions Section */}
                  <div className="text-uppercase fw-bold text-muted mb-1.5" style={{ fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                    My Account
                  </div>
                  <div className="d-flex flex-column gap-1">
                    {isAdmin ? (
                      <>
                        <Link
                          to="/admin/dashboard"
                          className="btn btn-sm btn-primary text-start d-flex align-items-center gap-2 py-2"
                          onClick={() => setNavOpen(false)}
                        >
                          <i className="bi bi-speedometer2"></i>
                          <span>Admin ERP Dashboard</span>
                        </Link>
                        <Link
                          to="/admin/rent"
                          className="btn btn-sm btn-white border text-start d-flex align-items-center gap-2 py-2"
                          onClick={() => setNavOpen(false)}
                        >
                          <i className="bi bi-credit-card text-success"></i>
                          <span>Rent Management</span>
                        </Link>
                        <Link
                          to="/admin/rooms"
                          className="btn btn-sm btn-white border text-start d-flex align-items-center gap-2 py-2"
                          onClick={() => setNavOpen(false)}
                        >
                          <i className="bi bi-building text-secondary"></i>
                          <span>Rooms & Beds</span>
                        </Link>
                        <Link
                          to="/admin/residents"
                          className="btn btn-sm btn-white border text-start d-flex align-items-center gap-2 py-2"
                          onClick={() => setNavOpen(false)}
                        >
                          <i className="bi bi-person-badge text-secondary"></i>
                          <span>Residents</span>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/dashboard"
                          className="btn btn-sm btn-primary text-start d-flex align-items-center gap-2 py-2"
                          onClick={() => setNavOpen(false)}
                        >
                          <i className="bi bi-grid"></i>
                          <span>Dashboard</span>
                        </Link>
                        <Link
                          to="/report"
                          className="btn btn-sm btn-white border text-start d-flex align-items-center gap-2 py-2"
                          onClick={() => setNavOpen(false)}
                        >
                          <i className="bi bi-exclamation-octagon text-danger"></i>
                          <span>Report an Issue</span>
                        </Link>
                        <Link
                          to="/my-bookings"
                          className="btn btn-sm btn-white border text-start d-flex align-items-center gap-2 py-2"
                          onClick={() => setNavOpen(false)}
                        >
                          <i className="bi bi-door-open text-secondary"></i>
                          <span>My Bookings</span>
                        </Link>
                        <Link
                          to="/my-visits"
                          className="btn btn-sm btn-white border text-start d-flex align-items-center gap-2 py-2"
                          onClick={() => setNavOpen(false)}
                        >
                          <i className="bi bi-calendar-check text-secondary"></i>
                          <span>My Visits</span>
                        </Link>
                        <Link
                          to="/profile"
                          className="btn btn-sm btn-white border text-start d-flex align-items-center gap-2 py-2"
                          onClick={() => setNavOpen(false)}
                        >
                          <i className="bi bi-person-gear text-secondary"></i>
                          <span>Profile Settings</span>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="d-flex gap-2">
                  <Link
                    to="/login"
                    className="btn btn-sm btn-pg-secondary flex-fill text-center py-2 fw-semibold"
                    onClick={() => setNavOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="btn btn-sm btn-outline-dark flex-fill text-center py-2 fw-semibold"
                    onClick={() => setNavOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              )}

              {/* Public Website Links */}
              <div>
                <div className="text-uppercase fw-bold text-muted mb-1 px-1" style={{ fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                  Explore PG
                </div>
                <div className="d-flex flex-column gap-1">
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) => `btn btn-sm text-start d-flex align-items-center gap-2.5 py-2 px-2.5 rounded-2 ${isActive ? 'bg-light text-primary fw-bold' : 'text-dark border-0'}`}
                    onClick={() => setNavOpen(false)}
                  >
                    <i className="bi bi-house-door text-muted"></i>
                    <span>Home</span>
                  </NavLink>
                  <NavLink
                    to="/rooms"
                    className={({ isActive }) => `btn btn-sm text-start d-flex align-items-center gap-2.5 py-2 px-2.5 rounded-2 ${isActive ? 'bg-light text-primary fw-bold' : 'text-dark border-0'}`}
                    onClick={() => setNavOpen(false)}
                  >
                    <i className="bi bi-door-open text-muted"></i>
                    <span>Rooms & Pricing</span>
                  </NavLink>
                  <NavLink
                    to="/facilities"
                    className={({ isActive }) => `btn btn-sm text-start d-flex align-items-center gap-2.5 py-2 px-2.5 rounded-2 ${isActive ? 'bg-light text-primary fw-bold' : 'text-dark border-0'}`}
                    onClick={() => setNavOpen(false)}
                  >
                    <i className="bi bi-stars text-muted"></i>
                    <span>Facilities</span>
                  </NavLink>
                  <NavLink
                    to="/gallery"
                    className={({ isActive }) => `btn btn-sm text-start d-flex align-items-center gap-2.5 py-2 px-2.5 rounded-2 ${isActive ? 'bg-light text-primary fw-bold' : 'text-dark border-0'}`}
                    onClick={() => setNavOpen(false)}
                  >
                    <i className="bi bi-images text-muted"></i>
                    <span>Gallery</span>
                  </NavLink>
                  <NavLink
                    to="/location"
                    className={({ isActive }) => `btn btn-sm text-start d-flex align-items-center gap-2.5 py-2 px-2.5 rounded-2 ${isActive ? 'bg-light text-primary fw-bold' : 'text-dark border-0'}`}
                    onClick={() => setNavOpen(false)}
                  >
                    <i className="bi bi-geo-alt text-muted"></i>
                    <span>Location</span>
                  </NavLink>
                  <NavLink
                    to="/contact"
                    className={({ isActive }) => `btn btn-sm text-start d-flex align-items-center gap-2.5 py-2 px-2.5 rounded-2 ${isActive ? 'bg-light text-primary fw-bold' : 'text-dark border-0'}`}
                    onClick={() => setNavOpen(false)}
                  >
                    <i className="bi bi-telephone text-muted"></i>
                    <span>Contact</span>
                  </NavLink>
                  <NavLink
                    to="/about"
                    className={({ isActive }) => `btn btn-sm text-start d-flex align-items-center gap-2.5 py-2 px-2.5 rounded-2 ${isActive ? 'bg-light text-primary fw-bold' : 'text-dark border-0'}`}
                    onClick={() => setNavOpen(false)}
                  >
                    <i className="bi bi-info-circle text-muted"></i>
                    <span>About Us</span>
                  </NavLink>
                </div>
              </div>
            </div>

            {/* Drawer Footer with Quick Call & Logout */}
            <div className="p-3 border-top bg-light d-flex flex-column gap-2">
              <a
                href="tel:+917893744206"
                className="btn btn-sm btn-outline-dark d-flex align-items-center justify-content-center gap-2 py-2"
              >
                <i className="bi bi-telephone text-success"></i>
                <span className="small fw-semibold">+91 78937 44206 (Helpdesk)</span>
              </a>

              {isAuthenticated && (
                <button
                  className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center gap-2 py-2"
                  onClick={() => {
                    setNavOpen(false);
                    logout();
                    navigate('/');
                  }}
                >
                  <i className="bi bi-box-arrow-right"></i>
                  <span className="small fw-semibold">Logout</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
