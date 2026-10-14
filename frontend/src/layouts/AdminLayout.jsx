import React, { useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';

export default function AdminLayout() {
  const { user, isAuthenticated, isAdmin, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  // Guard: Protect all admin routes
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login" replace state={{ returnUrl: '/admin/dashboard' }} />;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: '/admin/dashboard', icon: 'speedometer2', label: 'Dashboard', end: true },
    { to: '/admin/rooms', icon: 'building', label: 'Room & Bed Management' },
    { to: '/admin/residents', icon: 'person-badge', label: 'Residents' },
    { to: '/admin/bookings', icon: 'door-open', label: 'Bookings' },
    { to: '/admin/visits', icon: 'calendar-check', label: 'Visit Requests' },
    { to: '/admin/users', icon: 'people', label: 'Registered Users' },
    { to: '/admin/facilities', icon: 'stars', label: 'Facilities' },
    { to: '/admin/gallery', icon: 'images', label: 'Gallery' },
    { to: '/admin/pg-details', icon: 'pencil-square', label: 'PG Information' },
    { to: '/admin/messages', icon: 'chat-left-dots', label: 'Contact Inquiries' },
    { to: '/admin/notifications', icon: 'bell', label: 'Notifications' },
    { to: '/admin/profile', icon: 'person-circle', label: 'Admin Profile' },
    { to: '/admin/settings', icon: 'gear', label: 'Settings & Slots' },
  ];


  return (
    <div className="d-flex min-vh-100 bg-light">
      {/* Sidebar Desktop & Mobile Offcanvas */}
      <aside
        className={`bg-dark text-white border-end d-flex flex-column justify-content-between p-3 ${
          sidebarOpen ? 'd-flex position-fixed h-100' : 'd-none d-lg-flex'
        }`}
        style={{
          width: '260px',
          backgroundColor: '#0F172A',
          zIndex: 1050,
          top: 0,
          left: 0,
          bottom: 0,
        }}
      >
        <div>
          {/* Admin Header */}
          <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom border-secondary border-opacity-25">
            <div className="d-flex align-items-center gap-2">
              <div
                className="d-flex align-items-center justify-content-center text-white rounded-3 fw-bold"
                style={{ width: '38px', height: '38px', backgroundColor: '#EA580C' }}
              >
                PG
              </div>
              <div>
                <div className="fw-bold text-white small lh-1">SRI LAKSHMI</div>
                <div className="text-white-50" style={{ fontSize: '0.68rem' }}>ADMIN ERP PANEL</div>
              </div>
            </div>
            <button
              className="btn btn-sm btn-outline-light d-lg-none"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="nav flex-column gap-1 overflow-auto" style={{ maxHeight: '70vh' }}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `d-flex align-items-center gap-2 px-3 py-2 rounded-3 text-decoration-none small transition-all ${
                    isActive
                      ? 'bg-warning text-dark fw-bold shadow-sm'
                      : 'text-light opacity-75 hover-bg-dark hover-opacity-100'
                  }`
                }
              >
                <i className={`bi bi-${item.icon} fs-6`}></i>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="pt-3 border-top border-secondary border-opacity-25">
          <div className="small text-white-50 mb-2 truncate">
            {user.full_name}
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-sm btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
          >
            <i className="bi bi-box-arrow-right"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow-1 d-flex flex-column overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center sticky-top shadow-xs">
          <div className="d-flex align-items-center gap-3">
            <button
              className="btn btn-sm btn-outline-dark d-lg-none"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <i className="bi bi-list fs-5"></i>
            </button>
            <h5 className="fw-bold mb-0 text-dark">PG Administration Portal</h5>
          </div>

          <div className="d-flex align-items-center gap-3">
            <NavLink to="/" target="_blank" className="btn btn-sm btn-outline-secondary d-none d-sm-inline-flex align-items-center gap-1">
              <i className="bi bi-box-arrow-up-right"></i>
              <span>View Public Website</span>
            </NavLink>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                Admin Active
              </span>
            </div>
          </div>
        </header>

        {/* Main Routed Page */}
        <main className="p-3 p-md-4 flex-grow-1 overflow-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
