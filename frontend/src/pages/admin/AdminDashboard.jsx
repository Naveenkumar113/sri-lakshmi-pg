import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { cachedGet } from '../../services/api';
import AdminOverviewHeader from '../../components/AdminOverviewHeader';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const currentMonthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Generate 6 months for month picker
  const monthOptions = [];
  const now = new Date();
  for (let i = -1; i < 5; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthOptions.push({ val, label });
  }

  const fetchAnalytics = async (monthVal, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const ttl = isRefresh ? 0 : 15000;
      const data = await cachedGet(`/admin/analytics?month=${monthVal}`, {}, ttl);
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin analytics', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedMonth);
  }, [selectedMonth]);

  if (loading && !stats) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="text-muted small mt-2">Loading overall operations and financial metrics...</p>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      {/* Reusable AdminOverviewHeader for Overall Dashboard */}
      <AdminOverviewHeader
        title="Overall Dashboard"
        subtitle="Real-time occupancy, collections, booking applications, and resident requests."
        badge="Live ERP"
        storageKey="dashboard"
        defaultCollapsed={false}
        summaryItems={[
          { label: 'Residents', value: stats?.active_residents || 0, colorClass: 'text-primary' },
          { label: 'Beds', value: `${stats?.occupied_beds || 0}/${stats?.total_beds || 0}`, colorClass: 'text-dark' },
          { label: 'Expected', value: `₹${(stats?.expected_rent || 0).toLocaleString()}`, colorClass: 'text-dark', isHiddenOnMobile: true },
          { label: 'Collected', value: `₹${(stats?.collected_rent || 0).toLocaleString()}`, colorClass: 'text-success' },
          { label: 'Outstanding', value: `₹${(stats?.outstanding_rent || 0).toLocaleString()}`, colorClass: 'text-danger' },
          { label: 'Bookings', value: stats?.pending_bookings || 0, colorClass: 'badge bg-danger rounded-pill px-1.5 py-0.5', isHiddenOnMobile: true },
          { label: 'Issues', value: stats?.open_reports || 0, colorClass: 'badge bg-warning text-dark rounded-pill px-1.5 py-0.5' },
        ]}
        rightActions={
          <div className="d-flex align-items-center gap-1.5">
            <div className="input-group input-group-sm" style={{ width: 'auto' }}>
              <span className="input-group-text bg-light text-muted border-end-0 py-1 px-2">
                <i className="bi bi-calendar-month"></i>
              </span>
              <select
                className="form-select form-select-sm fw-semibold py-1 px-2"
                style={{ fontSize: '0.8rem', height: '36px' }}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Select billing month"
              >
                {monthOptions.map((m) => (
                  <option key={m.val} value={m.val}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => fetchAnalytics(selectedMonth, true)}
              disabled={refreshing}
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 px-2.5"
              style={{ height: '36px' }}
              title="Refresh analytics data"
            >
              <i className={`bi bi-arrow-clockwise ${refreshing ? 'spin' : ''}`}></i>
              <span className="d-none d-sm-inline">Refresh</span>
            </button>
          </div>
        }
      >
        <div className="d-flex flex-column gap-3 mt-1">
          {/* SECTION 1: Rent & Collections Summary (Functional Cards) */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-2 px-1">
              <h6 className="fw-bold text-dark mb-0">
                <i className="bi bi-currency-rupee text-success me-1"></i>
                Monthly Rent & Collection Overview ({selectedMonth})
              </h6>
              <Link to={`/admin/rent?month=${selectedMonth}`} className="small text-decoration-none fw-semibold">
                Open Rent ERP &rarr;
              </Link>
            </div>

            <div className="row g-2.5 g-md-3">
              {/* Rent Expected */}
              <div className="col-6 col-md-3">
                <Link
                  to={`/admin/rent?month=${selectedMonth}&status=ALL`}
                  className="text-decoration-none text-dark"
                  title="Click to view all rent records for this month"
                >
                  <div className="stat-box border-top-primary h-100 p-3 bg-white rounded-3 border shadow-xs transition-hover">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small text-muted fw-semibold">Total Rent Expected</span>
                      <i className="bi bi-wallet2 text-primary fs-6"></i>
                    </div>
                    <h4 className="fw-bold mb-0 text-dark">
                      ₹{(stats?.expected_rent || 0).toLocaleString()}
                    </h4>
                    <div className="d-flex justify-content-between align-items-center small text-primary fw-semibold mt-1" style={{ fontSize: '0.72rem' }}>
                      <span>{selectedMonth}</span>
                      <span>View All &rarr;</span>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Rent Collected */}
              <div className="col-6 col-md-3">
                <Link
                  to={`/admin/rent?month=${selectedMonth}&status=PAID`}
                  className="text-decoration-none text-dark"
                  title="Click to view settled payment records"
                >
                  <div className="stat-box border-top-success h-100 p-3 bg-white rounded-3 border shadow-xs transition-hover">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small text-muted fw-semibold">Rent Collected</span>
                      <i className="bi bi-cash-stack text-success fs-6"></i>
                    </div>
                    <h4 className="fw-bold mb-0 text-success">
                      ₹{(stats?.collected_rent || 0).toLocaleString()}
                    </h4>
                    <div className="d-flex justify-content-between align-items-center small text-success fw-semibold mt-1" style={{ fontSize: '0.72rem' }}>
                      <span>
                        {stats?.expected_rent > 0
                          ? `${Math.round(((stats?.collected_rent || 0) / stats?.expected_rent) * 100)}% collected`
                          : '0%'}
                      </span>
                      <span>Payments &rarr;</span>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Outstanding Balance */}
              <div className="col-6 col-md-3">
                <Link
                  to={`/admin/rent?month=${selectedMonth}&status=PENDING`}
                  className="text-decoration-none text-dark"
                  title="Click to view records with pending rent balance"
                >
                  <div className="stat-box border-top-warning h-100 p-3 bg-white rounded-3 border shadow-xs transition-hover">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small text-muted fw-semibold">Outstanding Rent</span>
                      <i className="bi bi-hourglass-split text-warning fs-6"></i>
                    </div>
                    <h4 className="fw-bold mb-0 text-warning">
                      ₹{(stats?.outstanding_rent || 0).toLocaleString()}
                    </h4>
                    <div className="d-flex justify-content-between align-items-center small text-warning fw-semibold mt-1" style={{ fontSize: '0.72rem' }}>
                      <span>Balance Due</span>
                      <span>View &rarr;</span>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Overdue Rent & Count */}
              <div className="col-6 col-md-3">
                <Link
                  to={`/admin/rent?month=${selectedMonth}&status=OVERDUE`}
                  className="text-decoration-none text-dark"
                  title="Click to filter residents with overdue rent"
                >
                  <div className="stat-box border-top-danger h-100 p-3 bg-white rounded-3 border shadow-xs transition-hover">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small text-muted fw-semibold">Overdue Residents</span>
                      <span className="badge bg-danger rounded-pill px-2">{stats?.overdue_count || 0}</span>
                    </div>
                    <h4 className="fw-bold mb-0 text-danger">
                      {stats?.overdue_count || 0}
                    </h4>
                    <div className="d-flex justify-content-between align-items-center small text-danger fw-semibold mt-1" style={{ fontSize: '0.72rem' }}>
                      <span>₹{(stats?.overdue_amount || 0).toLocaleString()} overdue</span>
                      <span>Action &rarr;</span>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Resident Payment Breakdown (Paid vs Pending/Partial) */}
            <div className="row g-2.5 g-md-3 mt-1">
              <div className="col-6 col-md-3">
                <Link
                  to={`/admin/rent?month=${selectedMonth}&status=PAID`}
                  className="text-decoration-none text-dark"
                  title="Click to filter fully paid residents"
                >
                  <div className="p-3 bg-white rounded-3 border shadow-xs transition-hover h-100 d-flex justify-content-between align-items-center">
                    <div>
                      <span className="small text-muted fw-semibold d-block">Fully Paid Residents</span>
                      <h5 className="fw-bold mb-0 text-success">{stats?.paid_residents || 0}</h5>
                      <span className="text-muted small" style={{ fontSize: '0.7rem' }}>Zero dues</span>
                    </div>
                    <div className="bg-success-subtle p-2 rounded-circle text-success">
                      <i className="bi bi-check-circle-fill fs-5"></i>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="col-6 col-md-3">
                <Link
                  to={`/admin/rent?month=${selectedMonth}&status=PENDING`}
                  className="text-decoration-none text-dark"
                  title="Click to filter pending and partial payments"
                >
                  <div className="p-3 bg-white rounded-3 border shadow-xs transition-hover h-100 d-flex justify-content-between align-items-center">
                    <div>
                      <span className="small text-muted fw-semibold d-block">Pending & Partial</span>
                      <h5 className="fw-bold mb-0 text-warning">{stats?.pending_and_partial_residents || 0}</h5>
                      <span className="text-muted small" style={{ fontSize: '0.7rem' }}>
                        {stats?.partially_paid_residents || 0} partial • {stats?.pending_residents || 0} pending
                      </span>
                    </div>
                    <div className="bg-warning-subtle p-2 rounded-circle text-warning">
                      <i className="bi bi-pie-chart-fill fs-5"></i>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="col-6 col-md-3">
                <Link
                  to="/admin/residents?status=ACTIVE"
                  className="text-decoration-none text-dark"
                  title="Click to view all active PG residents"
                >
                  <div className="p-3 bg-white rounded-3 border shadow-xs transition-hover h-100 d-flex justify-content-between align-items-center">
                    <div>
                      <span className="small text-muted fw-semibold d-block">Active Residents</span>
                      <h5 className="fw-bold mb-0 text-primary">{stats?.active_residents || 0}</h5>
                      <span className="text-muted small" style={{ fontSize: '0.7rem' }}>Currently residing</span>
                    </div>
                    <div className="bg-primary-subtle p-2 rounded-circle text-primary">
                      <i className="bi bi-person-badge-fill fs-5"></i>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="col-6 col-md-3">
                <Link
                  to="/admin/rooms"
                  className="text-decoration-none text-dark"
                  title="Click to view room and bed allocations"
                >
                  <div className="p-3 bg-white rounded-3 border shadow-xs transition-hover h-100 d-flex justify-content-between align-items-center">
                    <div>
                      <span className="small text-muted fw-semibold d-block">Occupied Beds</span>
                      <h5 className="fw-bold mb-0 text-dark">
                        {stats?.occupied_beds || 0} <span className="small text-muted fw-normal">/ {stats?.total_beds || 0}</span>
                      </h5>
                      <span className="text-muted small" style={{ fontSize: '0.7rem' }}>
                        {stats?.occupancy_rate || 0}% occupied
                      </span>
                    </div>
                    <div className="bg-info-subtle p-2 rounded-circle text-info">
                      <i className="bi bi-building fs-5"></i>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* SECTION 2: Operational Summaries (Visits, Bookings & Maintenance Reports) */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-2 px-1">
              <h6 className="fw-bold text-dark mb-0">
                <i className="bi bi-grid-fill text-primary me-1"></i>
                Applications, Visits & Maintenance Summary
              </h6>
            </div>

            <div className="row g-2.5 g-md-3">
              {/* Pending Visits */}
              <div className="col-6 col-md-3">
                <Link
                  to="/admin/visits?status=PENDING"
                  className="text-decoration-none text-dark"
                  title="Click to review pending visit appointments"
                >
                  <div className="p-3 bg-white rounded-3 border shadow-xs transition-hover h-100">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small text-muted fw-semibold">Pending Visits</span>
                      <span className="badge bg-warning text-dark rounded-pill">{stats?.pending_visits || 0}</span>
                    </div>
                    <h4 className="fw-bold mb-0 text-warning">{stats?.pending_visits || 0}</h4>
                    <div className="d-flex justify-content-between align-items-center small text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                      <span>{stats?.approved_visits || 0} approved</span>
                      <span className="text-primary fw-semibold">Review &rarr;</span>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Pending Bookings */}
              <div className="col-6 col-md-3">
                <Link
                  to="/admin/bookings?status=PENDING"
                  className="text-decoration-none text-dark"
                  title="Click to review room bookings awaiting bed allocation"
                >
                  <div className="p-3 bg-white rounded-3 border shadow-xs transition-hover h-100">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small text-muted fw-semibold">Pending Bookings</span>
                      <span className="badge bg-danger rounded-pill">{stats?.pending_bookings || 0}</span>
                    </div>
                    <h4 className="fw-bold mb-0 text-danger">{stats?.pending_bookings || 0}</h4>
                    <div className="d-flex justify-content-between align-items-center small text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                      <span>{stats?.approved_bookings || 0} allocated</span>
                      <span className="text-primary fw-semibold">Allocate &rarr;</span>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Open Maintenance Reports */}
              <div className="col-6 col-md-3">
                <Link
                  to="/admin/reports?status=OPEN"
                  className="text-decoration-none text-dark"
                  title="Click to view open resident maintenance issue reports"
                >
                  <div className="p-3 bg-white rounded-3 border shadow-xs transition-hover h-100">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small text-muted fw-semibold">Open Maintenance</span>
                      <span className="badge bg-danger rounded-pill">{stats?.open_reports || 0}</span>
                    </div>
                    <h4 className="fw-bold mb-0 text-danger">{stats?.open_reports || 0}</h4>
                    <div className="d-flex justify-content-between align-items-center small text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                      <span>{stats?.in_progress_reports || 0} in progress</span>
                      <span className="text-danger fw-semibold">Inspect &rarr;</span>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Resolved Maintenance Reports */}
              <div className="col-6 col-md-3">
                <Link
                  to="/admin/reports?status=RESOLVED"
                  className="text-decoration-none text-dark"
                  title="Click to view resolved maintenance issue reports"
                >
                  <div className="p-3 bg-white rounded-3 border shadow-xs transition-hover h-100">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small text-muted fw-semibold">Resolved Issues</span>
                      <span className="badge bg-success rounded-pill">{stats?.resolved_reports || 0}</span>
                    </div>
                    <h4 className="fw-bold mb-0 text-success">{stats?.resolved_reports || 0}</h4>
                    <div className="d-flex justify-content-between align-items-center small text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                      <span>{stats?.total_reports || 0} total reports</span>
                      <span className="text-success fw-semibold">Resolved &rarr;</span>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AdminOverviewHeader>

      {/* SECTION 3: Live Occupancy Progress */}
      <div className="bg-white p-3 p-md-4 rounded-4 border shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div>
            <h6 className="fw-bold mb-0 text-dark">PG Bed Occupancy & Room Capacity</h6>
            <div className="text-muted small">
              {stats?.occupied_beds || 0} occupied of {stats?.total_beds || 0} total beds across {stats?.total_rooms || 0} rooms
            </div>
          </div>
          <span className="badge bg-primary px-3 py-1.5 fs-6 fw-bold">
            {stats?.occupancy_rate || 0}%
          </span>
        </div>
        <div className="progress" style={{ height: '14px', borderRadius: '8px' }}>
          <div
            className="progress-bar progress-bar-striped progress-bar-animated"
            role="progressbar"
            style={{
              width: `${stats?.occupancy_rate || 0}%`,
              backgroundColor: '#EA580C',
            }}
            aria-valuenow={stats?.occupancy_rate || 0}
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>
        <div className="d-flex justify-content-between small text-muted mt-2">
          <span>{stats?.occupied_beds || 0} Beds Occupied</span>
          <span>{stats?.available_rooms || 0} Available Rooms</span>
          <span>{(stats?.total_beds || 0) - (stats?.occupied_beds || 0)} Beds Vacant</span>
        </div>
      </div>

      {/* SECTION 4: Recent Activity Feeds (Visits & Bookings) */}
      <div className="row g-3">
        {/* Recent Visits */}
        <div className="col-lg-6">
          <div className="bg-white p-3 p-md-4 rounded-4 border shadow-sm h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0 text-dark">Recent Visit Requests</h6>
                <Link to="/admin/visits" className="small text-decoration-none fw-semibold">
                  Manage All &rarr;
                </Link>
              </div>

              {stats?.recent_visits?.length === 0 ? (
                <p className="text-muted small py-3 text-center">No recent visit requests recorded.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle small mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Visitor</th>
                        <th>Schedule</th>
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
          <div className="bg-white p-3 p-md-4 rounded-4 border shadow-sm h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0 text-dark">Recent Room Bookings</h6>
                <Link to="/admin/bookings" className="small text-decoration-none fw-semibold">
                  Manage All &rarr;
                </Link>
              </div>

              {stats?.recent_bookings?.length === 0 ? (
                <p className="text-muted small py-3 text-center">No recent booking requests recorded.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle small mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Resident Applicant</th>
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
