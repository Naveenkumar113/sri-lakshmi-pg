import React from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function UserLayout() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="bg-light min-vh-100 py-4">
      <div className="container">
        {/* User Greeting Bar */}
        <div className="bg-white p-3 p-md-4 rounded-4 border shadow-sm mb-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold shadow-sm"
              style={{
                width: '52px',
                height: '52px',
                background: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)',
                fontSize: '1.25rem',
              }}
            >
              {user.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h5 className="fw-bold text-dark mb-0">{user.full_name}</h5>
              <div className="text-muted small">
                {user.occupation || 'Resident / Guest'} • {user.phone}
              </div>
            </div>
          </div>

          <div className="d-flex gap-2">
            <NavLink to="/visit-request" className="btn btn-sm btn-outline-dark fw-semibold">
              <i className="bi bi-calendar2-plus me-1"></i> New Visit
            </NavLink>
            <NavLink to="/book-room" className="btn btn-sm btn-pg-primary fw-semibold">
              <i className="bi bi-key-fill me-1"></i> Book Room
            </NavLink>
          </div>
        </div>

        <div className="row g-4">
          {/* Sidebar Navigation */}
          <div className="col-lg-3">
            <div className="bg-white rounded-4 border shadow-sm p-3">
              <div className="text-uppercase small fw-bold text-muted px-3 py-2" style={{ letterSpacing: '0.05em' }}>
                User Portal
              </div>
              <nav className="nav flex-column gap-1">
                <NavLink
                  to="/dashboard"
                  end
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-grid fs-5"></i>
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/my-visits"
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-calendar-check fs-5"></i>
                  <span>My Visits</span>
                </NavLink>

                <NavLink
                  to="/my-bookings"
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-door-open fs-5"></i>
                  <span>My Bookings</span>
                </NavLink>

                <NavLink
                  to="/notifications"
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-bell fs-5"></i>
                  <span>Notifications</span>
                </NavLink>

                <NavLink
                  to="/profile"
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-person-gear fs-5"></i>
                  <span>My Profile</span>
                </NavLink>
              </nav>

              <hr className="my-3" />

              <div className="p-3 bg-light rounded-3">
                <div className="small fw-bold text-dark mb-1">
                  <i className="bi bi-headset text-primary me-1"></i> Need Help?
                </div>
                <div className="text-muted small mb-2">
                  Call the PG manager directly:
                </div>
                <a href="tel:+917893744206" className="fw-bold text-dark small text-decoration-none d-block">
                  +91 78937 44206
                </a>
              </div>
            </div>
          </div>

          {/* Main Content Body */}
          <div className="col-lg-9">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
