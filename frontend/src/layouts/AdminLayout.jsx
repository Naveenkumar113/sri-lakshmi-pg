import React, { useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';

export default function AdminLayout() {
  const { user, isAuthenticated, isAdmin, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
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

  // Simplified and consolidated 10 navigation items
  const navSections = [
    { to: '/admin/dashboard', icon: 'speedometer2', label: 'Overall', end: true },
    { to: '/admin/rent', icon: 'currency-rupee', label: 'Rent Management' },
    { to: '/admin/rooms', icon: 'building', label: 'Rooms & Beds' },
    { to: '/admin/residents', icon: 'person-badge', label: 'Residents' },
    { to: '/admin/bookings', icon: 'door-open', label: 'Bookings & Visits', aliases: ['/admin/visits'] },
    { to: '/admin/reports', icon: 'exclamation-octagon', label: 'Issue Reports' },
    { to: '/admin/facilities', icon: 'stars', label: 'Facilities & Gallery', aliases: ['/admin/gallery'] },
    { to: '/admin/pg-details', icon: 'pencil-square', label: 'PG Information' },
    { to: '/admin/messages', icon: 'chat-left-dots', label: 'Contact Inquiries' },
    { to: '/admin/profile', icon: 'person-circle', label: 'Admin Profile' },
  ];

  return (
    <div className="d-flex min-vh-100 bg-light">
      {/* Mobile Backdrop when sidebar is open */}
      {sidebarOpen && (
        <div
          className="admin-mobile-backdrop d-lg-none"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Modern Sidebar (Desktop & Mobile Slide-in Drawer) */}
      <aside
        className={`text-white d-flex flex-column justify-content-between transition-all ${
          sidebarOpen ? 'd-flex position-fixed h-100 shadow-lg' : 'd-none d-lg-flex'
        }`}
        style={{
          width: desktopCollapsed ? '80px' : '260px',
          backgroundColor: '#0A0F1D', // Deep navy/charcoal background
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 1050,
          position: sidebarOpen ? 'fixed' : 'sticky',
          top: 0,
          left: 0,
          bottom: 0,
          height: '100vh',
          transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="d-flex flex-column h-100 overflow-hidden">
          {/* Brand Header */}
          <div
            className="d-flex align-items-center justify-content-between p-3 border-bottom border-white border-opacity-10"
            style={{ minHeight: '68px' }}
          >
            <div className="d-flex align-items-center gap-2.5 overflow-hidden">
              <div
                className="d-flex align-items-center justify-content-center text-white rounded-3 fw-bold flex-shrink-0 shadow-sm"
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
                  fontSize: '0.95rem',
                }}
              >
                SL
              </div>
              {!desktopCollapsed && (
                <div className="overflow-hidden">
                  <div className="fw-bold text-white small text-truncate" style={{ letterSpacing: '0.01em' }}>
                    Sri Lakshmi PG Admin
                  </div>
                  <div className="text-white-50 small" style={{ fontSize: '0.68rem' }}>
                    ERP Control Center
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            <button
              className="btn btn-sm btn-link text-white-50 p-1 d-lg-none text-decoration-none"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation drawer"
            >
              <i className="bi bi-x-lg fs-5"></i>
            </button>
          </div>

          {/* Navigation Links List */}
          <nav
            className="nav flex-column gap-1 p-2 flex-grow-1 overflow-auto"
            style={{ scrollbarWidth: 'thin' }}
          >
            {navSections.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => {
                  const isCurrentActive =
                    isActive ||
                    (item.aliases && item.aliases.some((alias) => window.location.pathname.startsWith(alias)));
                  return `d-flex align-items-center rounded-3 text-decoration-none transition-all px-3 py-2.5 ${
                    desktopCollapsed ? 'justify-content-center px-0' : 'gap-3'
                  } ${
                    isCurrentActive
                      ? 'text-white fw-bold shadow-xs'
                      : 'text-light opacity-75 hover-opacity-100 hover-bg-dark'
                  }`;
                }}
                style={({ isActive }) => {
                  const isCurrentActive =
                    isActive ||
                    (item.aliases && item.aliases.some((alias) => window.location.pathname.startsWith(alias)));
                  return {
                    backgroundColor: isCurrentActive ? 'rgba(234, 88, 12, 0.95)' : 'transparent',
                    borderLeft: isCurrentActive ? '3px solid #FDBA74' : '3px solid transparent',
                    minHeight: '44px',
                  };
                }}
                title={desktopCollapsed ? item.label : undefined}
              >
                <i className={`bi bi-${item.icon} fs-5 flex-shrink-0`}></i>
                {!desktopCollapsed && (
                  <span className="small text-truncate" style={{ fontSize: '0.86rem' }}>
                    {item.label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Sidebar Footer & Collapse Toggle */}
          <div className="p-2 border-top border-white border-opacity-10 mt-auto bg-black bg-opacity-25">
            {/* Desktop Collapse Option */}
            <button
              type="button"
              onClick={() => setDesktopCollapsed(!desktopCollapsed)}
              className="btn btn-sm text-white-50 hover-text-white w-100 d-none d-lg-flex align-items-center justify-content-center gap-2 py-2 mb-1 rounded-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
              title={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <i className={`bi ${desktopCollapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`}></i>
              {!desktopCollapsed && <span className="small">Collapse Menu</span>}
            </button>

            {/* Admin Profile Info */}
            {!desktopCollapsed && (
              <div className="px-2 py-1.5 mb-1 d-flex align-items-center justify-content-between">
                <div className="overflow-hidden">
                  <div className="small fw-semibold text-white text-truncate">{user.full_name}</div>
                  <div className="text-white-50" style={{ fontSize: '0.68rem' }}>PG Management</div>
                </div>
                <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '0.65rem' }}>
                  Admin
                </span>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`btn btn-sm btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2 py-2 ${
                desktopCollapsed ? 'px-0' : ''
              }`}
              style={{ minHeight: '40px' }}
              title="Logout from Admin ERP"
            >
              <i className="bi bi-box-arrow-right"></i>
              {!desktopCollapsed && <span className="small fw-semibold">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow-1 d-flex flex-column overflow-hidden min-vh-100">
        {/* Top Header */}
        <header className="bg-white border-bottom px-3 px-md-4 py-2.5 py-md-3 d-flex justify-content-between align-items-center sticky-top shadow-xs">
          <div className="d-flex align-items-center gap-2 gap-md-3">
            <button
              className="btn btn-outline-dark d-lg-none d-flex align-items-center justify-content-center p-2"
              style={{ width: '42px', height: '42px' }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation drawer"
            >
              <i className="bi bi-list fs-4"></i>
            </button>
            <div>
              <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.05rem' }}>
                Sri Lakshmi Srinivasa PG
              </h5>
              <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                Administrative ERP Portal • Velachery, Chennai
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <NavLink
              to="/"
              target="_blank"
              className="btn btn-sm btn-outline-secondary d-none d-sm-inline-flex align-items-center gap-1.5"
            >
              <i className="bi bi-box-arrow-up-right"></i>
              <span>Public Website</span>
            </NavLink>

            <NavLink
              to="/admin/rent"
              className="btn btn-sm btn-pg-primary d-inline-flex align-items-center gap-1.5 py-1 px-3 shadow-xs"
            >
              <i className="bi bi-currency-rupee"></i>
              <span className="d-none d-sm-inline">Rent Portal</span>
            </NavLink>
          </div>
        </header>

        {/* Main Routed Page */}
        <main className="p-2 p-sm-3 p-md-4 flex-grow-1 overflow-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
