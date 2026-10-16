import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function UserDashboard() {
  const { user } = useAuth();
  const [visits, setVisits] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [visRes, bookRes, notifRes] = await Promise.all([
          api.get('/visits/my'),
          api.get('/bookings/my'),
          api.get('/notifications'),
        ]);
        setVisits(visRes.data);
        setBookings(bookRes.data);
        setNotifications(notifRes.data);
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
  const unreadNotifs = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="d-flex flex-column gap-4">
      {/* 5 Stats Cards (Responsive 2-column mobile, 5-column wide) */}
      <div className="row g-2 g-md-3">
        <div className="col-6 col-md-4 col-xl">
          <div className="stat-box h-100 p-2.5 p-md-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold" style={{ fontSize: '0.75rem' }}>My Visits</span>
              <div className="rounded-circle p-1.5 bg-light text-primary d-none d-sm-block">
                <i className="bi bi-calendar-check fs-6"></i>
              </div>
            </div>
            <h4 className="fw-bold mb-0 text-dark">{visits.length}</h4>
            <span className="small text-success fw-semibold" style={{ fontSize: '0.7rem' }}>
              {approvedVisits} Confirmed
            </span>
          </div>
        </div>

        <div className="col-6 col-md-4 col-xl">
          <div className="stat-box h-100 p-2.5 p-md-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold" style={{ fontSize: '0.75rem' }}>My Bookings</span>
              <div className="rounded-circle p-1.5 bg-light text-warning d-none d-sm-block">
                <i className="bi bi-door-open fs-6"></i>
              </div>
            </div>
            <h4 className="fw-bold mb-0 text-dark">{bookings.length}</h4>
            <span className="small text-warning fw-semibold" style={{ fontSize: '0.7rem' }}>
              {approvedBookings} Confirmed
            </span>
          </div>
        </div>

        <div className="col-6 col-md-4 col-xl">
          <div className="stat-box h-100 p-2.5 p-md-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold" style={{ fontSize: '0.75rem' }}>Pending</span>
              <div className="rounded-circle p-1.5 bg-light text-secondary d-none d-sm-block">
                <i className="bi bi-hourglass-split fs-6"></i>
              </div>
            </div>
            <h4 className="fw-bold mb-0 text-dark">{pendingVisits + pendingBookings}</h4>
            <span className="small text-muted" style={{ fontSize: '0.7rem' }}>Review in progress</span>
          </div>
        </div>

        <div className="col-6 col-md-4 col-xl">
          <div className="stat-box h-100 p-2.5 p-md-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold" style={{ fontSize: '0.75rem' }}>Approved</span>
              <div className="rounded-circle p-1.5 bg-light text-success d-none d-sm-block">
                <i className="bi bi-check-circle-fill fs-6"></i>
              </div>
            </div>
            <h4 className="fw-bold mb-0 text-success">{approvedVisits + approvedBookings}</h4>
            <span className="small text-success" style={{ fontSize: '0.7rem' }}>Ready</span>
          </div>
        </div>

        <div className="col-12 col-md-4 col-xl">
          <div className="stat-box h-100 p-2.5 p-md-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold" style={{ fontSize: '0.75rem' }}>Alerts</span>
              <div className="rounded-circle p-1.5 bg-light text-danger d-none d-sm-block">
                <i className="bi bi-bell-fill fs-6"></i>
              </div>
            </div>
            <h4 className="fw-bold mb-0 text-dark">{unreadNotifs}</h4>
            <span className="small text-muted" style={{ fontSize: '0.7rem' }}>{notifications.length} Total Alerts</span>
          </div>
        </div>
      </div>

      {/* Active Confirmed Visit or Booking Notice */}
      {approvedVisits > 0 && (
        <div className="p-4 bg-white rounded-4 border border-success border-opacity-50 shadow-sm d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center rounded-circle bg-success text-white" style={{ width: '48px', height: '48px' }}>
              <i className="bi bi-calendar2-check-fill fs-4"></i>
            </div>
            <div>
              <h6 className="fw-bold mb-0 text-success">You have an Approved Visit Scheduled!</h6>
              <p className="text-secondary small mb-0">
                Please visit Sri Lakshmi Srinivasa Gents PG at 3, Bhavani St, Bharathi Nagar, Velachery.
              </p>
            </div>
          </div>
          <Link to="/my-visits" className="btn btn-sm btn-outline-success fw-semibold">
            View Visit Details
          </Link>
        </div>
      )}

      {/* Recent Visits Table */}
      <div className="bg-white rounded-4 border shadow-sm p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0">My Visit Appointments</h5>
          <Link to="/my-visits" className="small text-decoration-none fw-semibold text-primary">
            View All ({visits.length})
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary"></div>
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-4 bg-light rounded-3">
            <i className="bi bi-calendar-x fs-2 text-muted"></i>
            <p className="small text-muted mt-2 mb-2">You haven't scheduled any PG visits yet.</p>
            <Link to="/visit-request" className="btn btn-sm btn-pg-primary">
              Schedule Your First Visit
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small">
                <tr>
                  <th>Preferred Date</th>
                  <th>Time Slot</th>
                  <th>Purpose</th>
                  <th>Confirmed Schedule</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="small">
                {visits.slice(0, 3).map((v) => (
                  <tr key={v.id}>
                    <td className="fw-semibold">{v.preferred_date}</td>
                    <td>{v.preferred_time}</td>
                    <td>{v.purpose}</td>
                    <td>
                      {v.confirmed_date ? (
                        <span className="text-success fw-bold">
                          {v.confirmed_date} at {v.confirmed_time}
                        </span>
                      ) : (
                        <span className="text-muted">Awaiting confirmation</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill status-${v.status.toLowerCase()}`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Bookings Table */}
      <div className="bg-white rounded-4 border shadow-sm p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0">My Room Bookings</h5>
          <Link to="/my-bookings" className="small text-decoration-none fw-semibold text-primary">
            View All ({bookings.length})
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-4 bg-light rounded-3">
            <i className="bi bi-door-closed fs-2 text-muted"></i>
            <p className="small text-muted mt-2 mb-2">No active room bookings found.</p>
            <Link to="/book-room" className="btn btn-sm btn-pg-primary">
              Book a Room
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small">
                <tr>
                  <th>Room Category</th>
                  <th>Type</th>
                  <th>Joining Date</th>
                  <th>Allocated Room / Bed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="small">
                {bookings.slice(0, 3).map((b) => (
                  <tr key={b.id}>
                    <td className="fw-semibold">{b.room_type.replace('_', ' ')} Sharing</td>
                    <td>
                      <span className={`badge ${b.is_ac ? 'bg-primary' : 'bg-secondary'}`}>
                        {b.is_ac ? 'AC' : 'Non-AC'}
                      </span>
                    </td>
                    <td>{b.preferred_joining_date}</td>
                    <td>
                      {b.allocated_bed ? (
                        <span className="fw-bold text-success">
                          Bed {b.allocated_bed}
                        </span>
                      ) : (
                        <span className="text-muted">Pending allocation</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill status-${b.status.toLowerCase()}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
