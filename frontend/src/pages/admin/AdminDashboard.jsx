import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { cachedGet } from '../../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await cachedGet('/admin/analytics', {}, 15000);
        setStats(data);
      } catch (err) {
        console.error('Failed to load admin analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="text-muted small mt-2">Loading administrative metrics...</p>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      {/* Page Title */}
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h4 className="fw-bold mb-0">Operations Dashboard</h4>
          <p className="text-secondary small mb-0 d-none d-sm-block">
            Real-time metrics for Sri Lakshmi Srinivasa Gents PG.
          </p>
        </div>
        <span className="badge bg-primary-subtle text-primary border border-primary-subtle d-sm-none">
          Live PG
        </span>
      </div>

      {/* 8 SaaS Metric Cards (2-column on mobile) */}
      <div className="row g-2 g-md-3">
        <div className="col-6 col-md-3">
          <Link to="/admin/residents" className="text-decoration-none">
            <div className="stat-box h-100 border-start border-4 border-primary">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Active Residents</span>
                <i className="bi bi-people text-primary fs-6 d-none d-sm-block"></i>
              </div>
              <h4 className="fw-bold mb-0 text-dark">{stats?.active_residents || stats?.total_users}</h4>
              <span className="small text-primary fw-semibold">Manage &rarr;</span>
            </div>
          </Link>
        </div>

        <div className="col-6 col-md-3">
          <Link to="/admin/rooms" className="text-decoration-none">
            <div className="stat-box h-100 border-start border-4 border-info">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Inventory</span>
                <i className="bi bi-building text-info fs-6 d-none d-sm-block"></i>
              </div>
              <h4 className="fw-bold mb-0 text-dark">{stats?.total_rooms} Rooms</h4>
              <span className="small text-info fw-semibold">{stats?.total_beds} Beds &rarr;</span>
            </div>
          </Link>
        </div>

        <div className="col-6 col-md-3">
          <Link to="/admin/rooms" className="text-decoration-none">
            <div className="stat-box h-100 border-start border-4 border-success">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Available</span>
                <i className="bi bi-door-open text-success fs-6 d-none d-sm-block"></i>
              </div>
              <h4 className="fw-bold mb-0 text-success">{stats?.available_rooms}</h4>
              <span className="small text-muted">Ready rooms</span>
            </div>
          </Link>
        </div>

        <div className="col-6 col-md-3">
          <Link to="/admin/rooms" className="text-decoration-none">
            <div className="stat-box h-100 border-start border-4 border-warning">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Occupied Beds</span>
                <i className="bi bi-person-check text-warning fs-6 d-none d-sm-block"></i>
              </div>
              <h4 className="fw-bold mb-0 text-warning">{stats?.occupied_beds}</h4>
              <span className="small text-muted">{stats?.occupancy_rate}% Occupied</span>
            </div>
          </Link>
        </div>

        <div className="col-6 col-md-3">
          <Link to="/admin/visits" className="text-decoration-none">
            <div className="stat-box h-100">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Pending Visits</span>
                <span className="badge bg-danger rounded-pill px-2">{stats?.pending_visits}</span>
              </div>
              <h4 className="fw-bold mb-0 text-danger">{stats?.pending_visits}</h4>
              <span className="small text-muted">Review visits &rarr;</span>
            </div>
          </Link>
        </div>

        <div className="col-6 col-md-3">
          <Link to="/admin/visits" className="text-decoration-none">
            <div className="stat-box h-100">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Approved Visits</span>
                <i className="bi bi-check-all text-success fs-6 d-none d-sm-block"></i>
              </div>
              <h4 className="fw-bold mb-0 text-success">{stats?.approved_visits}</h4>
              <span className="small text-muted">Confirmed</span>
            </div>
          </Link>
        </div>

        <div className="col-6 col-md-3">
          <Link to="/admin/bookings" className="text-decoration-none">
            <div className="stat-box h-100">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Bookings Due</span>
                <span className="badge bg-warning text-dark rounded-pill px-2">{stats?.pending_bookings}</span>
              </div>
              <h4 className="fw-bold mb-0 text-warning">{stats?.pending_bookings}</h4>
              <span className="small text-muted">Allocate beds &rarr;</span>
            </div>
          </Link>
        </div>

        <div className="col-6 col-md-3">
          <div className="stat-box h-100">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold">Bookings OK</span>
              <i className="bi bi-key-fill text-primary fs-6 d-none d-sm-block"></i>
            </div>
            <h4 className="fw-bold mb-0 text-primary">{stats?.approved_bookings}</h4>
            <span className="small text-muted">Allocated</span>
          </div>
        </div>
      </div>

      {/* Monthly Rent & WhatsApp Overview */}
      <div className="bg-white p-4 rounded-4 border shadow-sm">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
          <div>
            <div className="d-flex align-items-center gap-2">
              <h6 className="fw-bold mb-0 text-dark">Monthly Rent & Automated WhatsApp Overview</h6>
              <span className="badge bg-success-subtle text-success border border-success-subtle">PostgreSQL 18</span>
            </div>
            <p className="text-secondary small mb-0 mt-1">Current month dues, collections, and automated WhatsApp reminder logs.</p>
          </div>
          <Link to="/admin/rent" className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-xs px-3">
            <i className="bi bi-currency-rupee"></i>
            <span>Open Rent Management &rarr;</span>
          </Link>
        </div>

        <div className="row g-3">
          <div className="col-6 col-md-3">
            <div className="p-3 bg-light rounded-3 border">
              <span className="small text-muted fw-semibold d-block mb-1">Expected Rent</span>
              <h5 className="fw-bold mb-0 text-dark">₹{(stats?.expected_rent || 0).toLocaleString()}</h5>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="p-3 bg-light rounded-3 border">
              <span className="small text-muted fw-semibold d-block mb-1">Collected Rent</span>
              <h5 className="fw-bold mb-0 text-success">₹{(stats?.collected_rent || 0).toLocaleString()}</h5>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="p-3 bg-light rounded-3 border">
              <span className="small text-muted fw-semibold d-block mb-1">Outstanding Rent</span>
              <h5 className="fw-bold mb-0 text-danger">₹{(stats?.outstanding_rent || 0).toLocaleString()}</h5>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="p-3 bg-light rounded-3 border">
              <span className="small text-muted fw-semibold d-block mb-1">Overdue Payments</span>
              <h5 className="fw-bold mb-0 text-danger">{stats?.overdue_count || 0} residents</h5>
            </div>
          </div>
        </div>
      </div>

      {/* Occupancy Rate Bar & Distribution */}
      <div className="bg-white p-4 rounded-4 border shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="fw-bold mb-0">Live PG Bed Occupancy Rate</h6>
          <span className="fw-bold text-primary">{stats?.occupancy_rate}%</span>
        </div>
        <div className="progress" style={{ height: '14px', borderRadius: '8px' }}>
          <div
            className="progress-bar progress-bar-striped progress-bar-animated bg-warning"
            role="progressbar"
            style={{ width: `${stats?.occupancy_rate}%` }}
            aria-valuenow={stats?.occupancy_rate}
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>
        <div className="d-flex justify-content-between small text-muted mt-2">
          <span>{stats?.occupied_beds} Beds Occupied</span>
          <span>{stats?.total_beds - stats?.occupied_beds} Beds Available</span>
        </div>
      </div>

      {/* Two Columns: Recent Visits & Recent Bookings */}
      <div className="row g-4">
        {/* Recent Visits */}
        <div className="col-lg-6">
          <div className="bg-white p-4 rounded-4 border shadow-sm h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">Recent Visit Requests</h6>
                <Link to="/admin/visits" className="small text-decoration-none fw-semibold">
                  Manage All
                </Link>
              </div>

              {stats?.recent_visits?.length === 0 ? (
                <p className="text-muted small">No visit requests recorded.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle small mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Visitor</th>
                        <th>Preferred Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.recent_visits?.map((v) => (
                        <tr key={v.id}>
                          <td className="fw-semibold">{v.full_name}</td>
                          <td>{v.preferred_date} • {v.preferred_time}</td>
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
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="col-lg-6">
          <div className="bg-white p-4 rounded-4 border shadow-sm h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">Recent Room Bookings</h6>
                <Link to="/admin/bookings" className="small text-decoration-none fw-semibold">
                  Manage All
                </Link>
              </div>

              {stats?.recent_bookings?.length === 0 ? (
                <p className="text-muted small">No booking requests recorded.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle small mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>User</th>
                        <th>Room Category</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.recent_bookings?.map((b) => (
                        <tr key={b.id}>
                          <td className="fw-semibold">{b.user_name}</td>
                          <td>{b.room_type} ({b.is_ac ? 'AC' : 'Non-AC'})</td>
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
        </div>
      </div>
    </div>
  );
}
