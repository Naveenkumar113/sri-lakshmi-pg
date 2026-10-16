import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function UserDashboard() {
  const { user } = useAuth();
  const [visits, setVisits] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [visRes, bookRes, repRes, notifRes] = await Promise.all([
          api.get('/visits/my'),
          api.get('/bookings/my'),
          api.get('/reports/my').catch(() => ({ data: { items: [] } })),
          api.get('/notifications'),
        ]);
        setVisits(visRes.data || []);
        setBookings(bookRes.data || []);
        setReports(repRes.data?.items || []);
        setNotifications(notifRes.data || []);
      } catch (err) {
        console.error('Failed to load user dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const pendingVisits = visits.filter((v) => v.status === 'PENDING').length;
  const approvedVisits = visits.filter((v) => v.status === 'APPROVED').length;
  const pendingBookings = bookings.filter((b) => b.status === 'PENDING').length;
  const approvedBookings = bookings.filter((b) => b.status === 'APPROVED').length;
  const openReports = reports.filter((r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS').length;
  const unreadNotifs = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="d-flex flex-column gap-3">
      {/* 1. Quick Actions Row (Essential Resident Shortcuts) */}
      <div className="bg-white p-3 p-md-3.5 rounded-3 border shadow-xs">
        <div className="text-uppercase fw-bold text-muted mb-2 px-0.5" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>
          Quick Actions
        </div>
        <div className="row g-2">
          <div className="col-4">
            <Link
              to="/book-room"
              className="btn btn-sm btn-outline-dark w-100 d-flex flex-column align-items-center justify-content-center p-2.5 rounded-3 h-100 text-decoration-none shadow-xs"
              style={{ minHeight: '68px' }}
            >
              <i className="bi bi-door-open fs-5 text-warning mb-0.5"></i>
              <span className="fw-semibold text-center" style={{ fontSize: '0.78rem' }}>Book Room</span>
            </Link>
          </div>
          <div className="col-4">
            <Link
              to="/visit-request"
              className="btn btn-sm btn-outline-dark w-100 d-flex flex-column align-items-center justify-content-center p-2.5 rounded-3 h-100 text-decoration-none shadow-xs"
              style={{ minHeight: '68px' }}
            >
              <i className="bi bi-calendar-plus fs-5 text-primary mb-0.5"></i>
              <span className="fw-semibold text-center" style={{ fontSize: '0.78rem' }}>Schedule Visit</span>
            </Link>
          </div>
          <div className="col-4">
            <Link
              to="/report"
              className="btn btn-sm btn-outline-danger w-100 d-flex flex-column align-items-center justify-content-center p-2.5 rounded-3 h-100 text-decoration-none shadow-xs"
              style={{ minHeight: '68px' }}
            >
              <i className="bi bi-exclamation-octagon fs-5 mb-0.5"></i>
              <span className="fw-semibold text-center" style={{ fontSize: '0.78rem' }}>Report Issue</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. My Activity Overview Cards (2-column on mobile, 4-column on desktop) */}
      <div className="row g-2">
        <div className="col-6 col-md-3">
          <Link to="/my-bookings" className="text-decoration-none">
            <div className="stat-box stat-box-interactive border-top-warning h-100 p-2.5">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">My Bookings</span>
                <i className="bi bi-door-open text-warning"></i>
              </div>
              <h4 className="fw-bold mb-0 text-dark">{bookings.length}</h4>
              <div className="text-muted small mt-1" style={{ fontSize: '0.7rem' }}>
                {pendingBookings > 0 ? (
                  <span className="text-warning fw-semibold">{pendingBookings} pending review</span>
                ) : approvedBookings > 0 ? (
                  <span className="text-success fw-semibold">{approvedBookings} active/confirmed</span>
                ) : (
                  <span>View status &rarr;</span>
                )}
              </div>
            </div>
          </Link>
        </div>

        <div className="col-6 col-md-3">
          <Link to="/my-visits" className="text-decoration-none">
            <div className="stat-box stat-box-interactive border-top-primary h-100 p-2.5">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">My Visits</span>
                <i className="bi bi-calendar-check text-primary"></i>
              </div>
              <h4 className="fw-bold mb-0 text-dark">{visits.length}</h4>
              <div className="text-muted small mt-1" style={{ fontSize: '0.7rem' }}>
                {approvedVisits > 0 ? (
                  <span className="text-success fw-semibold">{approvedVisits} scheduled</span>
                ) : pendingVisits > 0 ? (
                  <span className="text-warning fw-semibold">{pendingVisits} awaiting review</span>
                ) : (
                  <span>View visits &rarr;</span>
                )}
              </div>
            </div>
          </Link>
        </div>

        <div className="col-6 col-md-3">
          <Link to="/report" className="text-decoration-none">
            <div className="stat-box stat-box-interactive border-top-danger h-100 p-2.5">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">My Reports</span>
                <i className="bi bi-exclamation-octagon text-danger"></i>
              </div>
              <h4 className="fw-bold mb-0 text-dark">{reports.length}</h4>
              <div className="text-muted small mt-1" style={{ fontSize: '0.7rem' }}>
                {openReports > 0 ? (
                  <span className="text-danger fw-semibold">{openReports} in progress</span>
                ) : (
                  <span className="text-success fw-semibold">All resolved</span>
                )}
              </div>
            </div>
          </Link>
        </div>

        <div className="col-6 col-md-3">
          <Link to="/notifications" className="text-decoration-none">
            <div className="stat-box stat-box-interactive border-top-info h-100 p-2.5">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Notifications</span>
                <i className="bi bi-bell text-info"></i>
              </div>
              <h4 className="fw-bold mb-0 text-dark">{unreadNotifs}</h4>
              <div className="text-muted small mt-1" style={{ fontSize: '0.7rem' }}>
                {unreadNotifs > 0 ? (
                  <span className="text-primary fw-semibold">{unreadNotifs} new alerts</span>
                ) : (
                  <span>All caught up</span>
                )}
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. Confirmed Visit Alert Callout if Active */}
      {approvedVisits > 0 && (
        <div className="p-3 bg-white rounded-3 border border-success border-opacity-50 shadow-xs d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2.5">
            <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '36px', height: '36px' }}>
              <i className="bi bi-calendar2-check-fill fs-6"></i>
            </div>
            <div>
              <div className="fw-bold text-success small">Visit Scheduled</div>
              <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                Sri Lakshmi Srinivasa Gents PG • 3, Bhavani St, Velachery
              </div>
            </div>
          </div>
          <Link to="/my-visits" className="btn btn-xs btn-outline-success px-2.5 py-1.5 fw-semibold flex-shrink-0">
            Details &rarr;
          </Link>
        </div>
      )}

      {/* 4. Recent Activity Summary (Compact Mobile-First List) */}
      <div className="bg-white rounded-3 border shadow-xs p-3">
        <div className="d-flex justify-content-between align-items-center mb-2.5 pb-2 border-bottom">
          <h6 className="fw-bold text-dark mb-0">Recent Bookings & Visits</h6>
          <Link to="/my-bookings" className="small text-decoration-none fw-semibold text-primary" style={{ fontSize: '0.75rem' }}>
            View All &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-4 text-muted small">
            <div className="spinner-border spinner-border-sm text-primary me-2"></div>
            Loading your activity...
          </div>
        ) : bookings.length === 0 && visits.length === 0 ? (
          <div className="text-center py-4 bg-light rounded-2 text-muted small">
            <i className="bi bi-inbox fs-4 d-block mb-1 text-muted"></i>
            No active room bookings or visits yet.
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {bookings.slice(0, 2).map((b) => (
              <div key={`book-${b.id}`} className="p-2.5 bg-light rounded-2 border d-flex justify-content-between align-items-center gap-2">
                <div className="d-flex align-items-center gap-2 overflow-hidden">
                  <div className="rounded-circle p-1.5 bg-white border text-warning flex-shrink-0">
                    <i className="bi bi-door-open fs-6"></i>
                  </div>
                  <div className="overflow-hidden">
                    <div className="fw-bold text-dark small text-truncate">
                      {b.room_type ? b.room_type.replace('_', ' ') : 'Room'} Sharing ({b.is_ac ? 'AC' : 'Non-AC'})
                    </div>
                    <div className="text-muted small text-truncate" style={{ fontSize: '0.72rem' }}>
                      Joining: {b.preferred_joining_date} • {b.allocated_bed ? `Bed ${b.allocated_bed}` : 'Pending Bed'}
                    </div>
                  </div>
                </div>
                <span className={`status-pill status-${b.status.toLowerCase()} flex-shrink-0`} style={{ fontSize: '0.7rem' }}>
                  {b.status}
                </span>
              </div>
            ))}

            {visits.slice(0, 2).map((v) => (
              <div key={`vis-${v.id}`} className="p-2.5 bg-light rounded-2 border d-flex justify-content-between align-items-center gap-2">
                <div className="d-flex align-items-center gap-2 overflow-hidden">
                  <div className="rounded-circle p-1.5 bg-white border text-primary flex-shrink-0">
                    <i className="bi bi-calendar-check fs-6"></i>
                  </div>
                  <div className="overflow-hidden">
                    <div className="fw-bold text-dark small text-truncate">
                      Visit: {v.preferred_date} ({v.preferred_time})
                    </div>
                    <div className="text-muted small text-truncate" style={{ fontSize: '0.72rem' }}>
                      {v.confirmed_date ? `Confirmed: ${v.confirmed_date}` : 'Awaiting confirmation'}
                    </div>
                  </div>
                </div>
                <span className={`status-pill status-${v.status.toLowerCase()} flex-shrink-0`} style={{ fontSize: '0.7rem' }}>
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
